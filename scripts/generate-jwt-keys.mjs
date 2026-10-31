/**
 * scripts/generate-jwt-keys.mjs
 * -----------------------------
 * Generates an ECDSA P-256 key pair for ES256-signed JWTs and prints
 * ready-to-paste PEM values for the JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
 * environment variables (production: Vercel env / secret manager).
 *
 * Usage:
 *   node scripts/generate-jwt-keys.mjs
 *
 * Output PEM blocks use literal \n escapes so they can be pasted directly
 * into a single-line env var or JSON secret.
 */
import { generateKeyPairSync } from "crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const inline = pem => pem.replaceAll("\n", "\\n").trim();

console.log("JWT_PRIVATE_KEY=" + inline(privateKey));
console.log("JWT_PUBLIC_KEY=" + inline(publicKey));
console.log("");
console.log("Paste these into your environment. Key material is generated");
console.log("locally and never leaves this machine.");
