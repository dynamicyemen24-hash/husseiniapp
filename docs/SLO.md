# SLO / SLI — HSY Platform (SRE)

> Single source of truth for service-level targets. Code mirror:
> `server/_core/observability.ts` (`SLO_TARGETS`) + `GET /api/slo`.
> Runbook: `docs/OPERATIONS_RUNBOOK.md`. DR detail: `docs/BACKUP_AND_DR.md`.

## 1) SLIs & SLOs

| #   | SLI (how measured)                                                                                                                                       | SLO                                                                       | Window                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | **Availability** — `200 / total` on `GET /api/health` (real `select 1` vs Neon)                                                                          | **99.9%** (≈ 43 min error budget / 30d)                                   | 30d rolling                                                 |
| 2   | **Read latency** — p95 of tRPC `query` + HTTP `GET` durations (`route.kind=read` in `/api/slo.latency.read`)                                             | **p95 < 800ms**                                                           | 1h rolling (instance window) + Sentry Performance long-term |
| 3   | **Financial-write latency** — p95 of tRPC `mutation` on money/ledger paths (`invoices, payments, vouchers, journal, ledger, …` → `kind=financial_write`) | **p95 < 2000ms**                                                          | 1h rolling + Sentry Performance long-term                   |
| 4   | **Error rate** — `5xx / total` (HTTP) + tRPC-error responses (`ok:false`)                                                                                | **< 1%**                                                                  | 5 min                                                       |
| 5   | **Backup success** — nightly encrypted runs that succeed (`backup.status`, `recordBackupSuccess/Failure`)                                                | **> 99%** of scheduled runs / month; **page on ≥ 2 consecutive failures** | 30d + immediate counter                                     |
| 6   | **Webhook delivery** — outbound deliveries (order webhooks, subscription-code emails) with `delivered:true` (`recordWebhookDelivery`)                    | **> 99.5%**                                                               | 7d rolling                                                  |

**Financial-write route class** (`classifyTrpcRoute`): any mutation whose path matches
`invoice|payment|voucher|journal|ledger|transaction|billing|payroll|purchase|sale|pos|order|zatca|subscription|checkout|claim|fiscal|closing|balance|quotation`.
Everything else: queries → `read`, other mutations → `write`.

## 2) Burn-rate alerting (multi-window, Google SRE)

Error budget for availability (99.9%) = 0.1%. Alerts consume it at a _burn rate_;
fast burn pages, slow burn tickets.

| Signal              | Fast burn (page)                                                                   | Slow burn (ticket)                              | Owner                                            |
| ------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Availability        | burn ≥ 14.4× over **1h** + **5m** (≤ 2% budget in 1h)                              | burn ≥ 6× over **6h** + **30m**                 | On-call backend                                  |
| Error rate          | **> 5%** immediate (1m) **or** > 1% over 5m                                        | > 0.5% over 1h                                  | On-call backend                                  |
| p95 read            | **> 800ms** over 15m                                                               | > 600ms over 1h (early warning)                 | Backend owner                                    |
| p95 financial write | **> 2000ms** over 15m                                                              | > 1500ms over 1h (early warning)                | Backend owner                                    |
| Backup              | **≥ 2 consecutive failures** → Sentry `error` + cron `alert:true` (immediate page) | 1 failure → warning log + `backup.status` watch | Backend owner / on-call                          |
| Webhook delivery    | **< 99.5%** over 1h                                                                | < 99.8% over 24h                                | Backend owner                                    |
| Health 503          | `/api/health` **503 × 3 probes**                                                   | 1× 503 → warning                                | On-call backend → 15m → Tech Lead → Neon support |

Escalation everywhere: on-call → Tech Lead (15m no-ack) → status page + post-mortem within 48h for paging incidents.

## 3) `GET /api/slo` (light ops dashboard, no heavy deps)

Public, aggregate-only (no PII), `Cache-Control: no-store, private`.
Each serverless instance reports **its own** in-memory window honestly via `sampleWindow`
(ring buffer, last ≤ 2000 requests); fleet-wide truth comes from Sentry + the external prober.

```json
{
  "ok": true,
  "service": "alhusainia-platform",
  "version": "7.0.0",
  "requestId": "…",
  "traceId": "…",
  "time": "2026-09-17T00:00:00.000Z",
  "db": { "available": true, "latencyMs": 42, "cached": true },
  "backup": {
    "consecutiveFailures": 0,
    "needsAlert": false,
    "lastFailureAt": null,
    "lastSuccessAt": "2026-09-16T21:00:00.000Z"
  },
  "latency": {
    "read": {
      "count": 812,
      "p50": 38,
      "p95": 210,
      "avgMs": 61.4,
      "maxMs": 1240,
      "errorPct": 0.12
    },
    "financialWrite": {
      "count": 96,
      "p50": 310,
      "p95": 1180,
      "avgMs": 402.1,
      "maxMs": 1980,
      "errorPct": 0
    },
    "all": {
      "count": 908,
      "p50": 44,
      "p95": 260,
      "avgMs": 97.3,
      "maxMs": 1980,
      "errorPct": 0.11
    }
  },
  "errorPctOverall": 0.11,
  "totalRequests": 908,
  "webhook": { "attempts": 34, "succeeded": 34, "deliveryPct": 100 },
  "targets": {
    "availabilityPct": 99.9,
    "p95ReadMs": 800,
    "p95FinancialWriteMs": 2000,
    "errorPct": 1,
    "backupSuccessPct": 99,
    "webhookDeliveryPct": 99.5
  },
  "verdict": {
    "p95Read": "ok",
    "p95FinancialWrite": "ok",
    "errorRate": "ok",
    "webhookDelivery": "ok"
  },
  "sampleWindow": 908,
  "evaluatedAt": "2026-09-17T00:00:00.000Z"
}
```

`verdict` values: `ok` | `breach` | `no_data` (window not filled yet — cold instance, not a pass).

## 4) Synthetic checks (external cron)

`scripts/synthetic-check.mjs` — read-only probes, safe to run every 1–5 min from any
external cron (Vercel Cron, GitHub Actions, UptimeRobot webhook):

```bash
node scripts/synthetic-check.mjs --base-url https://<app>
node scripts/synthetic-check.mjs --help
```

Probes: `GET /api/live` → `GET /api/health` (requires 200 + `ok:true`) →
`GET /api/trpc/auth.me` (requires HTTP 200 + valid tRPC envelope; unauthenticated
`null` is a **pass** — it proves routing works without sending credentials).
Any failure → `EXIT 1` with a JSON summary (wire the exit code to paging).

## 5) Tracing & logs (lightweight OTel)

- No OTel SDK (bundle stays lean for serverless). W3C **Trace Context protocol only**:
  honours incoming `traceparent`; otherwise `traceId = sha256(x-request-id)[0..32]`.
- Every response echoes `x-request-id` + `x-trace-id`; every structured log line carries
  `requestId + traceId + tenantId + route + durationMs` via the single
  `logger`/`redact()` entrypoint; Sentry events carry `request_id` + `trace_id` tags.
