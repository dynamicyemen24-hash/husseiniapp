/**
 * server/aliasAiRouter.ts — ألياس (ALIAS AI) smart assistant endpoints.
 *
 * A branded, grounded chat assistant for the platform. Rules enforced here:
 *  - Tenant-scoped (tenantProcedure) with a per-tenant rate limit.
 *  - System prompt comes from shared/aliasAi.ts so client and server never drift.
 *  - Never invents data: on any LLM failure it degrades to a clear bilingual
 *    fallback message instead of guessing ("no-failure" policy).
 */

import { z } from "zod";
import { router, tenantProcedure, publicProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { getTenantAIProvider, invokeTenantLLM } from "./_core/tenantAI";
import { getDb } from "./db";
import { tenants } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  ALIAS_AI,
  ALIAS_ACTION_SUGGESTIONS,
  buildAliasPublicPrompt,
  buildAliasSystemPrompt,
} from "../shared/aliasAi";
import { withRetry, withTimeout } from "./_core/resilience";
import { classifyIntent, buildTenantContext } from "./_core/aliasBrain";

// ─── Simple per-tenant sliding-window rate limit ────────────────────────────
const RATE_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 }; // 30 msgs / hour / tenant
const hits = new Map<number, number[]>();

function checkRate(tenantId: number): boolean {
  const now = Date.now();
  const list = (hits.get(tenantId) || []).filter(
    t => now - t < RATE_LIMIT.windowMs
  );
  if (list.length >= RATE_LIMIT.max) {
    hits.set(tenantId, list);
    return false;
  }
  list.push(now);
  hits.set(tenantId, list);
  return true;
}

// ─── Global visitor rate limit (public website mode) ────────────────────────
const ANON_LIMIT = { max: 600, windowMs: 60 * 60 * 1000 }; // 600 msgs/hour platform-wide
let anonHits: number[] = [];

function checkAnonRate(): boolean {
  const now = Date.now();
  anonHits = anonHits.filter(t => now - t < ANON_LIMIT.windowMs);
  if (anonHits.length >= ANON_LIMIT.max) return false;
  anonHits.push(now);
  return true;
}

/** Extract plain text from an LLM content value (string or content parts). */
function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part): string =>
        part && typeof part === "object" && "text" in part
          ? String((part as { text?: unknown }).text ?? "")
          : ""
      )
      .join("");
  }
  if (raw && typeof raw === "object" && "text" in raw) {
    return String((raw as { text?: unknown }).text ?? "");
  }
  return JSON.stringify(raw ?? {});
}

const FALLBACK_AR =
  "عذراً، تعذّر الاتصال بمحرك الذكاء الاصطناعي الآن. يمكنك إعادة المحاولة بعد لحظات، أو التواصل مع فريق الدعم عبر ودجج «تواصل معنا المباشر». لن أخمّن إجابة عن بياناتك المالية.";
const FALLBACK_EN =
  "Sorry, the AI engine is temporarily unreachable. Please retry shortly or contact support via the live widget. I will never guess about your financial data.";

export const aliasAiRouter = router({
  /** Identity + availability — PUBLIC so the widget works on the marketing site. */
  status: publicProcedure.query(async () => ({
    nameAr: ALIAS_AI.nameAr,
    nameEn: ALIAS_AI.nameEn,
    fullNameAr: ALIAS_AI.fullNameAr,
    taglineAr: ALIAS_AI.taglineAr,
    version: ALIAS_AI.version,
    avatar: ALIAS_AI.avatar,
    avatarSmall: ALIAS_AI.avatarSmall,
    enabled: Boolean(ENV.forgeApiKey),
  })),

  /** Chat completion, branded and grounded. */
  chat: tenantProcedure
    .input(
      z.object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(8000),
            })
          )
          .min(1)
          .max(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = Number(ctx.tenantId);
      if (!Number.isFinite(tenantId) || tenantId <= 0) {
        throw new Error("TENANT_REQUIRED");
      }
      if (!checkRate(tenantId)) {
        throw new Error("RATE_LIMITED");
      }

      // ── Intelligence layer: classify intent, then ground with live data ──
      const lastUserMessage =
        [...input.messages].reverse().find(m => m.role === "user")?.content ??
        "";
      const intent = classifyIntent(lastUserMessage);
      const contextBlock = await buildTenantContext(tenantId, intent);
      const suggestions = ALIAS_ACTION_SUGGESTIONS[intent];

      // Resolve tenant display name/currency for a personalized system prompt.
      let tenantName: string | null = null;
      let currency: string | null = null;
      try {
        const db = await getDb();
        const row = db
          ? await db
              .select({ name: tenants.name, currency: tenants.currency })
              .from(tenants)
              .where(eq(tenants.id, tenantId))
              .limit(1)
          : [];
        tenantName = row[0]?.name ?? null;
        currency = row[0]?.currency ?? null;
      } catch {
        /* non-fatal: proceed without personalization */
      }

      const tenantAIProvider = await getTenantAIProvider(tenantId);
      if (!tenantAIProvider && !ENV.forgeApiKey) {
        return {
          content: `${FALLBACK_AR}\n${FALLBACK_EN}`,
          degraded: true,
          suggestions,
          intent,
        };
      }

      try {
        const response = await withTimeout(
          withRetry(
            () =>
              invokeTenantLLM(tenantId, {
                messages: [
                  {
                    role: "system" as const,
                    content: buildAliasSystemPrompt({
                      tenantName,
                      currency,
                      contextBlock,
                    }),
                  },
                  ...input.messages,
                ],
              }),
            { label: "alias-ai-chat", retries: 2 }
          ),
          60_000,
          "alias-ai-chat"
        );

        const raw = response.choices[0]?.message?.content;
        const content = extractText(raw);

        if (!content.trim()) throw new Error("empty LLM response");

        return {
          content,
          degraded: false,
          assistant: `${ALIAS_AI.nameEn} / ${ALIAS_AI.nameAr}`,
          suggestions,
          grounded: Boolean(contextBlock),
          intent,
        };
      } catch (e) {
        console.warn("[alias-ai] chat failed, degrading gracefully:", e);
        // Rate-limit errors surface distinctly; everything else degrades.
        return { content: FALLBACK_AR, degraded: true, suggestions, intent };
      }
    }),

  /**
   * PUBLIC website chat — visitor mode on the marketing site.
   * No tenant data whatsoever; ألياس answers as a platform product expert.
   */
  publicChat: publicProcedure
    .input(
      z.object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(4000),
            })
          )
          .min(1)
          .max(16),
      })
    )
    .mutation(async ({ input }) => {
      const platformSuggestions = [
        { labelAr: "صفحة الأسعار", href: "/pricing" },
        { labelAr: "تواصل معنا", href: "/contact" },
      ];

      if (!checkAnonRate()) {
        return {
          content:
            "بلغ عدد الرسائل حده الأقصى مؤقتاً — يرجى المحاولة بعد قليل، أو تواصل معنا مباشرة عبر ودجج الدعم.",
          degraded: true,
          suggestions: platformSuggestions,
        };
      }

      const fallbackPublic =
        "أهلاً بك في منصة الحسينية! تعذّر الاتصال بمحرك الذكاء الآن. المنصة تقدم محاسبة كاملة بالقيد المزدوج، مخزوناً ذكياً بالدفعات والصلاحيات، نقطة بيع تعمل أوفلاين، ومشتريات باعتمادات متعددة — جرّب النظام أو اطلب عرضاً عبر صفحة التواصل.";

      if (!ENV.forgeApiKey) {
        return {
          content: fallbackPublic,
          degraded: true,
          suggestions: platformSuggestions,
        };
      }

      try {
        const response = await withTimeout(
          withRetry(
            () =>
              invokeLLM({
                messages: [
                  {
                    role: "system" as const,
                    content: buildAliasPublicPrompt(),
                  },
                  ...input.messages,
                ],
              }),
            { label: "alias-public-chat", retries: 1 }
          ),
          45_000,
          "alias-public-chat"
        );
        const content = extractText(response.choices[0]?.message?.content);
        if (!content.trim()) throw new Error("empty LLM response");
        return {
          content,
          degraded: false,
          assistant: `${ALIAS_AI.nameEn} / ${ALIAS_AI.nameAr}`,
          suggestions: platformSuggestions,
        };
      } catch (e) {
        console.warn("[alias-ai] public chat failed:", e);
        return {
          content: fallbackPublic,
          degraded: true,
          suggestions: platformSuggestions,
        };
      }
    }),
});
