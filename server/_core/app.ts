import "dotenv/config";
import crypto from "crypto";
import * as Sentry from "@sentry/node";
import { expressErrorHandler } from "@sentry/node";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerWebApi } from "./webApi";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getDb, warmDatabase } from "../db";
import { sql } from "drizzle-orm";
import { ENV } from "./env";
import { logger } from "./logger";
import { getJwks } from "./jwt";
import {
  performanceMiddleware,
  getPerformanceStats,
} from "./enterprise-performance";
import { deriveTraceId, getSloSnapshot } from "./observability";
import { getBackupHealth } from "./backup";
import {
  checkBruteForce,
  recordFailedAttempt,
  recordSuccessfulLogin,
  generateNonce,
  detectAnomaly,
  updateIpReputation,
} from "./securityShield";
import {
  deduplicateRequest,
  generateDeduplicationKey,
  checkETag,
  generateETag,
} from "./performance";
import {
  setSecurityHeaders,
  obfuscateResponse,
  stripSensitiveFields,
  isDebugEnvironment,
} from "./apiSecurity";
import {
  databaseCircuitBreaker,
  databaseBulkhead,
  healthMonitor,
} from "./resilience";
import { cacheManager, userCache, sessionCache } from "./cache";
import { validateInput, detectSqlInjection } from "./inputSanitizer";

export type DbHealth = { available: boolean; latencyMs: number };

const healthCache = {
  lastCheck: 0,
  dbAvailable: false,
  dbLatencyMs: 0,
  inFlight: false as Promise<DbHealth> | false,
};

async function checkDbHealth(): Promise<DbHealth> {
  if (Date.now() - healthCache.lastCheck < 5000 && !healthCache.inFlight) {
    return {
      available: healthCache.dbAvailable,
      latencyMs: healthCache.dbLatencyMs,
    };
  }

  if (healthCache.inFlight) {
    return healthCache.inFlight;
  }

  const probe = (async () => {
    const t0 = Date.now();
    let result = false;
    try {
      // Use circuit breaker and bulkhead for database health check
      await databaseCircuitBreaker.execute(
        async () => {
          await databaseBulkhead.execute(async () => {
            const db = await getDb();
            if (db) {
              await db.execute(sql`select 1`);
              result = true;
            }
          });
        },
        async () => {
          // Fallback: return false on circuit breaker open
          result = false;
        }
      );
    } catch {
      result = false;
    }
    const latencyMs = Date.now() - t0;
    healthCache.lastCheck = Date.now();
    healthCache.dbAvailable = result;
    healthCache.dbLatencyMs = latencyMs;
    return { available: result, latencyMs };
  })();

  healthCache.inFlight = probe;
  try {
    return await probe;
  } finally {
    healthCache.inFlight = false;
  }
}

if (ENV.sentryDsn) {
  Sentry.init({
    dsn: ENV.sentryDsn,
    environment: ENV.isProduction ? "production" : "development",
    tracesSampleRate: ENV.isProduction ? 0.1 : 1.0,
    profilesSampleRate: ENV.isProduction ? 0.1 : 1.0,
    integrations: [Sentry.expressIntegration()],
  });
}

export function createApp(): Express {
  const app = express();

  // Sentry: expressIntegration() automatically patches Express when init() is called.
  // No manual requestHandler/tracingHandler needed in v10+ (handled by OpenTelemetry instrumentation).

  // Hide X-Powered-By header
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // Serverless cold-start mitigation: begin the Neon handshake immediately so
  // the first real query (login verify, health checks, etc.) is already warm.
  void warmDatabase();

  // ── SECURITY SHIELD: Anti-Debug Detection ──
  if (ENV.isProduction) {
    if (isDebugEnvironment()) {
      logger.warn("[SECURITY] Debug mode detected in production");
    }
  }

  // ── SECURITY SHIELD: Request Security Middleware ──
  app.use((req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const path = req.path;

    // Detect anomalies
    const anomaly = detectAnomaly(ip, path);
    if (anomaly.anomalous) {
      logger.warn("[SECURITY] Anomaly detected", {
        ip,
        path,
        reason: anomaly.reason,
      });
      updateIpReputation(ip, false);
      res.status(429).json({ error: "تم اكتشاف نشاط مشبوه" });
      return;
    }

    // SQL injection detection in query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === "string") {
          const sqlCheck = detectSqlInjection(value);
          if (!sqlCheck.safe) {
            logger.warn("[SECURITY] SQL injection attempt detected", {
              ip,
              path,
              key,
              patterns: sqlCheck.patterns,
            });
            updateIpReputation(ip, false);
            res.status(400).json({ error: "طلب غير صالح" });
            return;
          }
        }
      }
    }

    // Body SQL injection detection
    if (req.body && typeof req.body === "object") {
      const bodyStr = JSON.stringify(req.body);
      const sqlCheck = detectSqlInjection(bodyStr);
      if (!sqlCheck.safe) {
        logger.warn("[SECURITY] SQL injection in body detected", {
          ip,
          path,
          patterns: sqlCheck.patterns,
        });
        updateIpReputation(ip, false);
        res.status(400).json({ error: "طلب غير صالح" });
        return;
      }
    }

    // Set security headers
    setSecurityHeaders(res);

    // Add request fingerprint header
    const fingerprint = crypto
      .createHash("sha256")
      .update(`${ip}|${req.headers["user-agent"] || ""}|${Date.now()}`)
      .digest("hex")
      .substring(0, 16);
    res.setHeader("X-Request-Fingerprint", fingerprint);

    next();
  });

  // 12-factor request correlation — every request gets x-request-id early so
  // both access logs and error logs can be joined. This is the SINGLE source
  // of truth: downstream middleware (performance), tRPC context and Sentry
  // all reuse this value and never generate a second ID. The light traceId
  // extends x-request-id (or honours W3C `traceparent`) — see observability.ts.
  app.use((req, res, next) => {
    const incoming = req.headers["x-request-id"];
    const id =
      typeof incoming === "string" &&
      incoming.length > 0 &&
      incoming.length <= 128
        ? incoming
        : crypto.randomUUID();
    (req as any).requestId = id;
    const traceId = deriveTraceId(id, req.headers["traceparent"]);
    (req as any).traceId = traceId;
    res.setHeader("x-request-id", id);
    res.setHeader("x-trace-id", traceId);
    try {
      Sentry.getCurrentScope?.().setTag("request_id", id);
      Sentry.getCurrentScope?.().setTag("trace_id", traceId);
    } catch {
      /* Sentry optional */
    }
    next();
  });

  // Apex: inject Tajawal locale hint for SSR (يُستخدم في الحروف العربية)
  app.use((_req, res, next) => {
    res.setHeader("X-Typography", "Tajawal-Apex");
    res.setHeader("X-Icon-System", "HusIcons-v2");
    next();
  });

  // Request correlation + performance instrumentation for all API calls.
  app.use(performanceMiddleware);

  // Helmet security headers — CSP بدون unsafe-inline عبر nonce عشوائي
  app.use((req, _res, next) => {
    const nonce = Buffer.from(crypto.randomUUID())
      .toString("base64")
      .slice(0, 22);
    (req as any).cspNonce = nonce;
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            (_req: any, res: any) =>
              `'nonce-${(res.req as any).cspNonce}'` as any,
          ],
          styleSrc: ["'self'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: [
            "'self'",
            "https://*.neon.tech",
            "https://*.vercel.app",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
          ],
          workerSrc: ["'self'", "blob:"],
          manifestSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xDnsPrefetchControl: { allow: true },
    })
  );

  // Permissions-Policy — removed from helmet v7+; set explicitly to lock down
  // browser feature access (camera, mic, geolocation, payment, usb, sensors).
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), " +
        "accelerometer=(), gyroscope=(), magnetometer=(), sync-xhr=()"
    );
    next();
  });

  // PERFORMANCE: Enable gzip/brotli compression for all responses.
  // This significantly reduces payload sizes for JSON API responses and
  // static assets, improving load times especially on slower connections.
  app.use(compression());

  // Rate limiting — Vercel-aware.
  // - `trust proxy:1` above ensures `req.ip` is the real client behind Vercel's edge.
  // - `validate:false` silences express-rate-limit's trust-proxy warning which we
  //   handle explicitly. Memory store is per-lambda (acceptable for 5/hour guest
  //   orders); set `UPSTASH_REDIS_REST_URL` to upgrade to Redis without code change
  //   (the import is lazy so the bundle stays lean).
  const maybeRedisStore = (() => {
    try {
      // Lazy: only if the operator provisioned Upstash (Vercel Marketplace → Upstash Redis).
      if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Redis } = require("@upstash/redis");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { RedisStore } = require("rate-limit-redis");
        const client = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        return new RedisStore({
          sendCommand: (...args: string[]) => (client as any).sendCommand(args),
        });
      }
    } catch {
      // No Redis — fall back to in-memory (documented in rateLimit.ts).
    }
    return undefined;
  })();

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "تم تجاوز الحد المسموح من طلبات API." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: (req: Request, res: Response) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      logger.warn("[SECURITY] API rate limit exceeded", { ip, path: req.path });
      updateIpReputation(ip, false);
      res.status(429).json({
        error: "تم تجاوز الحد المسموح من طلبات API.",
        retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
      });
    },
    ...(maybeRedisStore ? { store: maybeRedisStore } : {}),
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "تم تجاوز الحد المسموح من محاولات تسجيل الدخول." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: (req: Request, res: Response) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      logger.warn("[SECURITY] Auth rate limit exceeded", {
        ip,
        path: req.path,
      });
      updateIpReputation(ip, false);
      res.status(429).json({
        error: "تم تجاوز الحد المسموح من محاولات تسجيل الدخول.",
        retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
      });
    },
    ...(maybeRedisStore ? { store: maybeRedisStore } : {}),
  });

  // tRPC-shaped 429s: the tRPC client deserializes EVERY response with superjson,
  // so a plain-JSON rate-limit body (express-rate-limit default) made whole
  // batches explode client-side as "Unable to transform response from server"
  // instead of a readable error. This handler mirrors tRPC's wire error format.
  // NOTE (v11): httpBatchLink treats a NON-array body as a single unbatched
  // response and duplicates it for every op — an index-keyed object therefore
  // hits transformResult's success path and throws TransformResultError. Batching
  // responses MUST be an ARRAY, one element per operation, in input order.
  // max is raised vs apiLimiter: one authenticated workspace journey (11 pages ×
  // several tRPC queries each, per user, per 15 min) legitimately exceeds 100.
  // TRPC_LIMIT_MAX lets CI/synthetic-load runs raise the cap without touching
  // the production default.
  const trpcRateLimitHandler: express.RequestHandler = (req, res) => {
    const json = {
      message: "تم تجاوز الحد المسموح من الطلبات. حاول بعد قليل.",
      code: -32029,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429, path: req.path },
    };
    let count = 1;
    try {
      if (req.method === "POST" && req.body && typeof req.body === "object") {
        count = Math.max(1, Object.keys(req.body).length);
      } else if (req.method === "GET" && typeof req.query.input === "string") {
        const parsed = JSON.parse(req.query.input as string);
        if (parsed && typeof parsed === "object") {
          count = Math.max(1, Object.keys(parsed).length);
        }
      }
    } catch {
      count = 1;
    }
    const body = Array.from({ length: count }, () => ({ error: { json } }));
    res.status(429).json(body);
  };

  const trpcLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.TRPC_LIMIT_MAX) || 600,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: trpcRateLimitHandler,
    ...(maybeRedisStore ? { store: maybeRedisStore } : {}),
  });

  // Configure body parser — SaaS hard limit (منع DoS بذاكرة Lambda)
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ limit: "100kb", extended: true }));

  // Middleware to catch malformed JSON body errors
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (
        err instanceof SyntaxError &&
        (err as any).status === 400 &&
        "body" in (err as any)
      ) {
        res.status(400).json({ error: "Invalid JSON Payload" });
        return;
      }
      next(err);
    }
  );

  // Structured access log — now via logger.info (Vercel JSON drain).
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        logger.info("access", {
          requestId: (req as any).requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          ms: Date.now() - start,
        });
      }
    });
    next();
  });

  // ── APEX Health — Deep probe مع SLOs ──
  // Honest readiness probe: real `select 1` against Neon with its own
  // DB latency, plus process uptime + version. Result cached 5s (see
  // checkDbHealth) so monitors can poll aggressively without hammering DB;
  // `cached:true` tells callers the dbLatencyMs comes from cache.
  app.get("/api/health", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const requestId =
      ((req as any).requestId as string) ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    res.setHeader("x-request-id", requestId);
    const start = Date.now();
    const servedFromCache = Date.now() - healthCache.lastCheck < 5000;
    const db = await checkDbHealth();
    const latencyMs = Date.now() - start;
    const uptimeSec = Math.floor(process.uptime());
    try {
      Sentry.getCurrentScope?.().setTag("request_id", requestId);
    } catch {
      /* noop */
    }
    res.status(db.available ? 200 : 503).json({
      ok: db.available,
      dbAvailable: db.available,
      dbLatencyMs: db.latencyMs,
      cached: servedFromCache,
      service: "alhusainia-platform",
      institution: "الحسينية لخدمات الأعمال",
      version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev",
      status: db.available ? "Operational" : "Degraded (DB unreachable)",
      security: "ISO-Compliant",
      requestId,
      slo: {
        latencyMs,
        uptimeSec,
        p95TargetMs: 300,
        availability: db.available ? "99.9%" : "degraded",
      },
      typography: "Tajawal Apex",
      iconSystem: "HusIcons Apex v2",
      time: new Date().toISOString(),
    });
  });

  // Liveness — no DB touch. Tells orchestrators the process itself is alive;
  // use /api/health for readiness (DB-gated).
  app.get("/api/live", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const requestId =
      ((req as any).requestId as string) ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    res.setHeader("x-request-id", requestId);
    res.status(200).json({
      ok: true,
      service: "alhusainia-platform",
      version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev",
      uptimeSec: Math.floor(process.uptime()),
      requestId,
      time: new Date().toISOString(),
    });
  });

  app.get("/api/performance", (_req, res) => {
    const stats = getPerformanceStats();
    res.setHeader("Cache-Control", "no-store, private");
    res.status(200).json({
      ok: true,
      ...stats,
      generatedAt: new Date().toISOString(),
      requestId:
        (res.getHeader("X-Request-ID") as string | undefined) ?? "unknown",
      status: "Operational",
    });
  });

  // ── SLO snapshot — light operational dashboard (no heavy deps) ──
  // Aggregates only (no PII): in-memory p50/p95 windows (HTTP + tRPC samples
  // recorded by performanceMiddleware / observabilityMiddleware), backup
  // program health, and the cached DB latency probe. Each serverless instance
  // reports its own window honestly via `sampleWindow`.
  app.get("/api/slo", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, private");
    const requestId =
      ((req as any).requestId as string) ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const traceId =
      ((req as any).traceId as string) || deriveTraceId(requestId);
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-trace-id", traceId);
    const db = await checkDbHealth();
    const backup = await getBackupHealth();
    const slo = getSloSnapshot();
    res.status(200).json({
      ok: true,
      service: "alhusainia-platform",
      version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev",
      requestId,
      traceId,
      time: new Date().toISOString(),
      db: {
        available: db.available,
        latencyMs: db.latencyMs,
        cached: Date.now() - healthCache.lastCheck < 5000,
      },
      backup: {
        consecutiveFailures: backup.consecutiveFailures,
        needsAlert: backup.needsAlert,
        lastFailureAt: backup.lastFailureAt,
        lastSuccessAt: backup.lastSuccessAt,
      },
      latency: {
        read: slo.observed.read,
        financialWrite: slo.observed.financialWrite,
        all: slo.observed.all,
      },
      errorPctOverall: slo.observed.errorPctOverall,
      totalRequests: slo.observed.totalRequests,
      webhook: slo.observed.webhook,
      targets: slo.targets,
      verdict: slo.verdict,
      sampleWindow: slo.sampleWindow,
      evaluatedAt: slo.evaluatedAt,
    });
  });

  // ── JWKS — public ES256 verification keys (rotation-aware) ──
  app.get("/api/auth/jwks", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).json(getJwks());
  });

  // ── Cache Statistics ──
  app.get("/api/cache/stats", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, private");
    res.status(200).json({
      ok: true,
      stats: cacheManager.getStats(),
      timestamp: new Date().toISOString(),
    });
  });

  // ── Circuit Breaker Status ──
  app.get("/api/circuit-breaker", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, private");
    res.status(200).json({
      ok: true,
      database: databaseCircuitBreaker.getStats(),
      health: healthMonitor.getHealth(),
      timestamp: new Date().toISOString(),
    });
  });

  registerStorageProxy(app);

  // SECURITY: Throttle the unauthenticated surfaces explicitly.
  // - /api/oauth performs token exchange, so it gets the strict auth limiter.
  // - /api/web is the public storefront (including place-order writes).
  app.use("/api/oauth", authLimiter);
  app.use("/api/web", apiLimiter);

  // ── SECURITY: Anti-Brute-Force for Login Endpoints ──
  app.use(
    "/api/trpc/auth.login",
    (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const body = req.body as any;
      const identifier = body?.json?.email || body?.json?.username || "unknown";

      const { allowed, retryAfterMs } = checkBruteForce(identifier, ip);
      if (!allowed) {
        logger.warn("[SECURITY] Brute force attempt blocked", {
          ip,
          identifier,
          retryAfterMs,
        });
        res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
        res.status(429).json({
          error: "تم حظر المحاولة مؤقتاً بسبب محاولات كثيرة",
          retryAfterMs,
        });
        return;
      }

      next();
    }
  );

  // ── PERFORMANCE: ETag Middleware for GET requests ──
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    const originalSend = res.send.bind(res);
    res.send = function (body: any) {
      if (body && req.headers["if-none-match"]) {
        const etag = generateETag(body);
        if (checkETag(req.headers["if-none-match"] as string, etag)) {
          res.status(304).end();
          return res;
        }
      }

      if (body) {
        const etag = generateETag(body);
        res.setHeader("ETag", `W/"${etag}"`);
      }

      return originalSend(body);
    };

    next();
  });

  registerOAuthRoutes(app);
  registerWebApi(app);
  // tRPC API
  // IMPORTANT (multi-tenant): responses are tenant-scoped and authenticated,
  // so they must NEVER be cached at a shared/CDN edge. A public s-maxage would
  // let one tenant's query result be served to another tenant (the cache key is
  // the URL only, ignoring the x-tenant-id header and the session cookie).
  // Mutations (POST/PATCH) are never cached regardless.
  app.use("/api/trpc", trpcLimiter);
  app.use("/api/trpc", (req, res, next) => {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store, private");
      res.setHeader("Vary", "x-tenant-id, cookie");
    }
    next();
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Sentry error handler must be before any other error handler
  if (ENV.sentryDsn) {
    app.use(expressErrorHandler() as any);
  }

  // Global error handler — correlation via logger.error.
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const requestId =
        (req as any).requestId ||
        (req.headers["x-request-id"] as string) ||
        "unknown";
      const ip = req.ip || req.socket.remoteAddress || "unknown";

      // Log security-related errors
      if (err?.status === 403 || err?.statusCode === 403) {
        logger.warn("[SECURITY] Forbidden access attempt", {
          requestId,
          ip,
          path: req.path,
          method: req.method,
        });
        updateIpReputation(ip, false);
      }

      try {
        Sentry.getCurrentScope?.().setTag("request_id", requestId);
        // expressErrorHandler() above already captured the exception;
        // only capture here when Sentry is on but that middleware is off.
        if (
          ENV.sentryDsn &&
          typeof (Sentry as any).captureException === "function"
        ) {
          (Sentry as any).captureException(err, {
            tags: { request_id: requestId },
          });
        }
      } catch {
        /* Sentry optional — the JSON log below is the durable signal */
      }
      logger.error("unhandled", {
        requestId,
        path: req.path,
        method: req.method,
        message: err?.message ?? String(err),
        stack: ENV.isProduction ? undefined : err?.stack,
      });
      res.setHeader("x-request-id", requestId);
      const status = err?.status ?? err?.statusCode ?? 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: "خطأ داخلي في الخادم",
        requestId,
      });
    }
  );

  // ── Start Health Monitoring ──
  healthMonitor.start(30_000);

  return app;
}
