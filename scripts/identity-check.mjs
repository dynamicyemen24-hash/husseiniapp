import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const out = [];
function logit(v) {
  out.push(typeof v === "string" ? v : JSON.stringify(v));
  console.log(...(typeof v === "string" ? [v] : [v]));
}

const {
  DATABASE_URL,
  OWNER_PASSWORD,
  OWNER_OPEN_ID,
  JWT_SECRET,
  OAUTH_SERVER_URL,
  NODE_ENV,
  VITE_APP_ID,
} = process.env;

logit(`ENV: NODE_ENV=${NODE_ENV || "<empty>"}`);
logit(`ENV: DATABASE_URL=${DATABASE_URL ? "SET" : "<empty>"}`);
logit(`ENV: OWNER_PASSWORD=${OWNER_PASSWORD ? "SET" : "<empty>"}`);
logit(`ENV: OWNER_OPEN_ID=${OWNER_OPEN_ID ? "SET" : "<empty>"}`);
logit(`ENV: JWT_SECRET=${JWT_SECRET ? "SET" : "<empty>"}`);
logit(`ENV: OAUTH_SERVER_URL=${OAUTH_SERVER_URL ? "SET" : "<empty>"}`);
logit(`ENV: VITE_APP_ID=${VITE_APP_ID ? "SET" : "<empty>"}`);

if (!DATABASE_URL) {
  logit("NO DATABASE_URL");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

logit("Users:");
logit(
  await sql`SELECT id, "openId", username, name, role, "tenantId", "loginMethod", "lastSignedIn" FROM users ORDER BY id`
);
logit("Tenants:");
logit(
  await sql`SELECT id, code, name, country, currency, "isLibrary", "isActive" FROM tenants ORDER BY id`
);
logit("Settings:");
logit(
  await sql`SELECT id, "tenantId", "institutionName", "accountingPeriod", "currency", "subscriptionStatus", "trialEndsAt" FROM settings ORDER BY id`
);
logit("DONE");
process.exit(0);
