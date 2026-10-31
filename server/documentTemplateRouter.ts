import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import { settings } from "../drizzle/schema";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  mergeDocumentTemplate,
  type DocumentTemplate,
} from "../shared/documentTemplate";
import { generateDocument } from "./services/documentGeneration";

const documentTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  header: z
    .object({
      showCompanyName: z.boolean().optional(),
      showLogo: z.boolean().optional(),
      companyName: z.string().optional(),
      logoUrl: z.string().optional(),
      customTextAbove: z.string().optional(),
      customTextBelow: z.string().optional(),
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
      fontSize: z.enum(["sm", "md", "lg"]).optional(),
      borderBottom: z.boolean().optional(),
    })
    .optional(),
  footer: z
    .object({
      showPageNumbers: z.boolean().optional(),
      showDate: z.boolean().optional(),
      showCompanyName: z.boolean().optional(),
      customTextAbove: z.string().optional(),
      customTextBelow: z.string().optional(),
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
      fontSize: z.enum(["sm", "md", "lg"]).optional(),
      borderTop: z.boolean().optional(),
    })
    .optional(),
  marginTop: z.number().optional(),
  marginBottom: z.number().optional(),
  marginLeft: z.number().optional(),
  marginRight: z.number().optional(),
  paperSize: z.enum(["a4", "letter", "legal", "custom"]).optional(),
  orientation: z.enum(["portrait", "landscape"]).optional(),
  fontFamily: z.string().optional(),
  language: z.enum(["ar", "en", "both"]).optional(),
  rtl: z.boolean().optional(),
});

export const documentTemplateRouter = router({
  get: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return DEFAULT_DOCUMENT_TEMPLATE;
    try {
      const tid = requireTenantId(ctx);
      const row = await db
        .select()
        .from(settings)
        .where(eq(settings.tenantId, tid))
        .limit(1);
      const raw = row[0]?.documentTemplate;
      if (raw && typeof raw === "string") {
        try {
          return JSON.parse(raw) as DocumentTemplate;
        } catch {
          return DEFAULT_DOCUMENT_TEMPLATE;
        }
      }
      if (raw && typeof raw === "object") return raw as DocumentTemplate;
      return DEFAULT_DOCUMENT_TEMPLATE;
    } catch {
      return DEFAULT_DOCUMENT_TEMPLATE;
    }
  }),

  update: tenantProcedure
    .input(documentTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return DEFAULT_DOCUMENT_TEMPLATE;
      try {
        const tid = requireTenantId(ctx);
        const current = await db
          .select()
          .from(settings)
          .where(eq(settings.tenantId, tid))
          .limit(1);
        const existing = current[0]?.documentTemplate;
        const merged = mergeDocumentTemplate(
          DEFAULT_DOCUMENT_TEMPLATE,
          existing ? JSON.stringify(existing) : undefined
        );
        const updated = { ...merged, ...input, id: merged.id || "default" };
        await db
          .update(settings)
          .set({ documentTemplate: JSON.stringify(updated) })
          .where(eq(settings.tenantId, tid));
        return updated;
      } catch {
        return DEFAULT_DOCUMENT_TEMPLATE;
      }
    }),

  reset: tenantProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return DEFAULT_DOCUMENT_TEMPLATE;
    try {
      const tid = requireTenantId(ctx);
      await db
        .update(settings)
        .set({ documentTemplate: JSON.stringify(DEFAULT_DOCUMENT_TEMPLATE) })
        .where(eq(settings.tenantId, tid));
      return DEFAULT_DOCUMENT_TEMPLATE;
    } catch {
      return DEFAULT_DOCUMENT_TEMPLATE;
    }
  }),

  generate: tenantProcedure
    .input(
      z.object({
        documentType: z.string().min(1).max(50),
        title: z.string().min(1).max(200),
        bodyContent: z.string().min(1).max(200000),
        pageNumber: z.number().int().min(1).default(1),
        totalPages: z.number().int().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      let template: DocumentTemplate = DEFAULT_DOCUMENT_TEMPLATE;
      try {
        if (db) {
          const tid = requireTenantId(ctx);
          const row = await db
            .select()
            .from(settings)
            .where(eq(settings.tenantId, tid))
            .limit(1);
          const raw = row[0]?.documentTemplate;
          if (raw && typeof raw === "string") {
            try {
              template = JSON.parse(raw) as DocumentTemplate;
            } catch {
              template = DEFAULT_DOCUMENT_TEMPLATE;
            }
          } else if (raw && typeof raw === "object") {
            template = raw as DocumentTemplate;
          }
        }
      } catch {
        template = DEFAULT_DOCUMENT_TEMPLATE;
      }
      const doc = generateDocument({
        documentType: input.documentType,
        title: input.title,
        template,
        bodyContent: input.bodyContent,
        pageNumber: input.pageNumber,
        totalPages: input.totalPages,
      });
      return {
        html: doc.html,
        title: doc.title,
        documentType: doc.documentType,
      };
    }),
});
