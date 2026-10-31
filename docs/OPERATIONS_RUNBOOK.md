# OPERATIONS RUNBOOK — HSY Platform (SRE/Continuity)

> Short on-call sheet. Detail: `docs/INCIDENT_RESPONSE_RUNBOOK.md` + `docs/BACKUP_AND_DR.md`. No real secrets in this repo.

## 1) Monitoring endpoints

| Endpoint                             | Type                 | Honest signal                                                                                                                                                                          |
| ------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                    | Readiness (DB-gated) | Real `select 1` vs Neon + `dbLatencyMs` + `uptimeSec` + `version` + `requestId`; cache 5s (`cached:true`); `200` ok / `503` degraded; `Cache-Control: no-store`; echoes `x-request-id` |
| `GET /api/live`                      | Liveness (no DB)     | Process alive: `200 { ok, version, uptimeSec, requestId }`                                                                                                                             |
| `GET /api/performance`               | SLO stats            | Cache hit-rates + uptime (`no-store, private`)                                                                                                                                         |
| `POST /api/cron/tick`                | Automation           | `Authorization: Bearer $CRON_SECRET` (503 fail-closed in prod without it); response includes `backup { attempted, ok, consecutiveFailures, alert }` + `requestId`                      |
| tRPC `backup.status` (admin)         | Backup program       | `{ consecutiveFailures, needsAlert, lastFailureAt, lastSuccessAt, recent[] }`                                                                                                          |
| tRPC `backup.verify/restore` (admin) | DR prove-out         | `verify { ok, totalRows }`; `restore dryRun:true` default, real needs `confirm:true`                                                                                                   |

```bash
curl -s https://<app>/api/health | jq '{ok,dbAvailable,dbLatencyMs,cached,uptimeSec,version,requestId}'
curl -s https://<app>/api/live | jq .
curl -s -X POST https://<app>/api/cron/tick -H "Authorization: Bearer $CRON_SECRET" | jq '{ok,backup,requestId}'
pnpm tsx scripts/backup-restore-test.ts   # weekly dry-run (verify + dry-run restore, never writes)
```

## 2) SLOs (source of truth: `docs/SLO.md` + `GET /api/slo`)

- **Availability 99.9%** monthly on `/api/health` (200-rate)
- **p95 reads < 800ms**, **p95 financial writes < 2000ms** (`/api/slo` windows + Sentry Performance long-term)
- **Error rate (5xx) < 1%** / 5min window
- **Backup success > 99%** / month (page on ≥ 2 consecutive failures)
- **Webhook delivery > 99.5%** / 7d
- Burn-rate windows + escalation: `docs/SLO.md §2`.

## 3) Alerts (owner + escalation each)

| Alert                       | Threshold                                                                     | Owner                   | Escalation                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Health 503 / DB unreachable | `/api/health` 503 × 3 probes                                                  | On-call backend         | 15m → Tech Lead → Neon support + status page                                                                    |
| 5xx spike                   | error% > 1% (5m) / > 5% immediate                                             | On-call backend         | Rollback release → Lead; post-mortem 48h                                                                        |
| p95 breach                  | p95 > 300ms (15m)                                                             | Backend owner           | Index/caching fix; Lead if > 1h                                                                                 |
| **Backup failing**          | **`consecutiveFailures ≥ 2`** (nightly or manual; Sentry + cron `alert:true`) | Backend owner / On-call | Same shift: check `BACKUP_ENCRYPTION_KEY` + S3/Forge + `backup.status`; Lead + freeze deploys if unresolved 24h |
| Cron auth misconfig         | `/api/cron/tick` 503 `CRON_SECRET not configured`                             | DevOps                  | Add secret in Vercel → redeploy                                                                                 |

## 4) Backup program (tested, fail-closed)

- AES-256-GCM/scrypt blobs, SHA-256 manifest, creds tables never exported.
- **`BACKUP_ENCRYPTION_KEY` (≥16 chars) required in production — missing = backups disabled, nightly records a failure (fail-closed).** Dev uses insecure fallback + warning only.
- Nightly via cron (once/day UTC, 30-copy retention); never throws the tick.
- Prove-out: `scripts/backup-restore-test.ts` weekly (CI/cron); full restore on staging quarterly, log date+result in `BACKUP_AND_DR.md`.

## 5) RPO / RTO

- **RPO ≤ 24h** (one nightly full backup; intraday loss accepted by design).
- **RTO ≤ 1h** (provision + migrate + verify + dry-run + restore + spot-checks).

## 6) Restore (short)

1. `pnpm db:migrate` on fresh Neon; confirm `BACKUP_ENCRYPTION_KEY` fingerprint matches.
2. `backup.list` → pick id → `backup.verify { id }` must be `ok:true`.
3. `backup.restore { id, dryRun:true }` → then `{ id, dryRun:false, confirm:true }` (admin only, additive `onConflictDoNothing` — wipes are explicit DBA ops).
4. Spot-check trial balance + customer balance; reopen traffic; log outcome.
5. Full script: `pnpm tsx scripts/backup-restore-test.ts --id <id>` (dry-run only).

## 7) Correlation + log hygiene

- **One `x-request-id`**: edge middleware (UUID) → `X-Request-ID` response header → `requestContext` → `TrpcContext.requestId` → access/error logs → Sentry tag `request_id`. Never fork a second ID; echo incoming IDs (≤128 chars).
- **One `redact()`** (`server/_core/logger.ts`): key-based (`password/token/secret/auth/cookie/session/otp/email/phone/health/…` + Arabic صحة/تشخيص/هاتف/بريد/…) → `[REDACTED]`; value-based masks e-mails, `Bearer …`, JWTs, 9+ digit runs; depth-capped, circular-safe, truncates > 4000 chars. All logger paths go through it; Sentry errors carry `request_id`, never raw PII.
