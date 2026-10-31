import type { Express } from "express";
import {
  getCatalog,
  placePublicOrder,
  catalogInputSchema,
  placeOrderInputSchema,
} from "../webStore";
import { getDb } from "../db";

/**
 * Allowed origins for the public storefront API. Configure via STORE_CORS_ORIGINS
 * (comma-separated) to lock down cross-origin access to specific domains.
 * When unset, the public endpoints reflect any origin — safe because these are
 * unauthenticated guest operations (catalog + guest order) that never touch
 * protected procedures or cookies.
 */
const ALLOWED_ORIGINS = (process.env.STORE_CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

/**
 * Public REST endpoints for website integration (separate from the platform UI).
 * - No authentication required by design: these mirror the public storefront.
 * - CORS is restricted to STORE_CORS_ORIGINS when configured, otherwise open.
 * - The website NEVER touches the admin UI or protected procedures.
 */
export function registerWebApi(app: Express) {
  app.use("/api/web", (req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.length > 0) {
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    } else {
      // Reflect any origin for the public, credential-free storefront.
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, x-tenant-id, x-idempotency-key"
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // GET /api/web/catalog?search=..&category=..  →  { items, categories }
  app.get("/api/web/catalog", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, private");
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, error: "قاعدة البيانات غير متاحة" });
        return;
      }
      const parsed = catalogInputSchema.safeParse({
        search:
          typeof req.query.search === "string" ? req.query.search : undefined,
        category:
          typeof req.query.category === "string"
            ? req.query.category
            : undefined,
      });
      const tid =
        Number.parseInt((req.headers["x-tenant-id"] as string) || "", 10) || 1;
      const data = await getCatalog(db, tid, parsed.success ? parsed.data : {});
      res.status(200).json({ ok: true, ...data });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // POST /api/web/place-order  →  { ok, orderId, orderNumber }
  app.post("/api/web/place-order", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, error: "قاعدة البيانات غير متاحة" });
        return;
      }
      const parsed = placeOrderInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: parsed.error.issues.map(i => i.message).join("؛ "),
        });
        return;
      }
      const tid =
        Number.parseInt((req.headers["x-tenant-id"] as string) || "", 10) || 1;
      // Webhook/double-submit retries send the key as x-idempotency-key;
      // the JSON body field wins when both are present.
      const headerKey =
        (req.headers["x-idempotency-key"] as string) || undefined;
      const result = await placePublicOrder(db, tid, {
        ...parsed.data,
        idempotencyKey: parsed.data.idempotencyKey ?? headerKey,
      });
      res.status(200).json({ ok: true, ...result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: String(e?.message || e) });
    }
  });
}
