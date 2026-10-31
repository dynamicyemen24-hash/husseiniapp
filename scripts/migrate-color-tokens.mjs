#!/usr/bin/env node
/**
 * Design-token migration: Tailwind arbitrary hex classes → named utilities
 * =========================================================================
 * Part of the design-system audit (see docs/DESIGN_SYSTEM.md).
 *
 * Transforms  `bg-[#b87945]`  →  `bg-brand`  etc. for every color in the
 * canonical mapping below. String/inline hex values (SVG stopColor, stroke,
 * Recharts data props, Canvas) are intentionally NOT touched — var() is not
 * supported inside SVG/Canvas attribute values; those keep literal hexes
 * until migrated to the cssVar() runtime bridge manually.
 *
 * Near-duplicate palette values are normalized to their canonical token
 * (ΔE ≤ 3, visually imperceptible): #102a2b→ink, #a06838→brand-deep,
 * #e8c9a0→brand-200, #5c3d1e→brand-800, #faf5ed→brand-50.
 *
 * Run:  node scripts/migrate-color-tokens.mjs [--dry]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "client", "src");

/** hex (lowercase, no #) → Tailwind token name (must exist in @theme or core palette) */
const MAP = {
  // Brand scale (Heritage Ledger)
  b87945: "brand",
  a06838: "brand-deep", // normalized ΔE≈2 → brand-600
  d4a574: "brand-300",
  e8c9a0: "brand-200", // normalized ΔE≈1
  e7c9a6: "brand-200",
  c08e52: "brand-400",
  f3e6d6: "brand-100",
  faf4ec: "brand-50",
  faf5ed: "brand-50", // normalized ΔE≈1
  "5c3d1e": "brand-800", // normalized ΔE≈1
  "7a5228": "brand-700",
  // Ink scale (theme-stable)
  "102a2b": "ink", // normalized ΔE≈1.5 → --ink
  "0e2a2b": "ink",
  "0a1f20": "ink-deep",
  "2a4e50": "ink-500",
  "1e3a3c": "ink-600",
  "16393b": "ink-700",
  "162e30": "ink-800",
  fbf8f2: "sand",
  // shadcn semantic surfaces
  e5dfd5: "border",
  eee6d6: "accent",
  f5f0e8: "muted",
  // Core-palette status/chart colors
  "6b7280": "gray-500",
  "0d9488": "teal-600",
  "0f766e": "teal-700",
  "0369a1": "sky-700",
  "0284c7": "sky-600",
  "7c3aed": "violet-600",
  f59e0b: "amber-500",
  "10b981": "emerald-500",
  f43f5e: "rose-500",
  // Second-pass consolidation (nearest-token, weighted-ΔE ≤ ~28)
  "0c2021": "ink-deep",
  "0d1b1c": "ink-deep",
  "0d2423": "ink-deep",
  "102a2c": "ink",
  "18393c": "ink-700",
  "193d3f": "ink-600",
  "1a3d3f": "ink-600",
  "1d3f40": "ink-600",
  "1d474a": "ink-500",
  "25484a": "ink-500",
  "1f7a6d": "teal-700",
  "9a6334": "brand-deep",
  c4956a: "brand-300",
  e2b17a: "brand-300",
  f0dfc8: "brand-100", // warm cream surface — NOT border (semantic, theme-swapped)
  f0ebe3: "muted",
  f5ece0: "muted",
  f5ede0: "muted",
  f6f7f5: "sand",
  fbf3ea: "brand-50",
  fbf6ee: "brand-50",
  fff8ef: "sand",
  "075985": "sky-800",
  "115e59": "teal-800",
  "14b8a6": "teal-500",
  "16a34a": "green-600",
  "2563eb": "blue-600",
  "7dd3fc": "sky-300",
  "8b5cf6": "violet-500",
  b45309: "amber-700",
  ca8a04: "yellow-600",
  dc2626: "red-600",
  fbbf24: "amber-400",
  // Third pass — gradient stops & stragglers
  eef1ea: "muted",
  "16302f": "ink",
  "3b82f6": "blue-500",
  f87171: "red-400",
  "22c55e": "green-500",
  d97706: "amber-600",
  e0b585: "brand-300",
  "1a1008": "ink-deep",
  eab308: "yellow-500",
  "6d28d9": "violet-700",
  a16207: "yellow-700",
  "92400e": "amber-800",
  ea5873: "rose-400",
  "1d4ed8": "blue-700",
  "15803d": "green-700",
};

const CLASS_RE = /([a-zA-Z][a-zA-Z0-9]*)-\[#([0-9a-fA-F]{6})\](\/\d{1,3})?/g;

// Repair pass for the earlier corrupted run (prefix captured its own dash,
// producing invalid double-dash utilities like `bg--ink`).
const REPAIR_RE = new RegExp(
  `\\b([a-z]+)--(${[...new Set(Object.values(MAP))].join("|")})(\\/\\d{1,3})?\\b`,
  "g"
);

const dry = process.argv.includes("--dry");
const stats = { files: 0, replaced: 0, repaired: 0, perHex: {} };

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx?|mjs|js)$/.test(entry)) transform(p);
  }
}

function transform(file) {
  const src = readFileSync(file, "utf8");
  let touched = false;
  let out = src.replace(REPAIR_RE, (full, prefix, token, opacity = "") => {
    stats.repaired++;
    touched = true;
    return `${prefix}-${token}${opacity}`;
  });
  out = out.replace(CLASS_RE, (full, prefix, hex, opacity = "") => {
    const token = MAP[hex.toLowerCase()];
    if (!token) return full;
    stats.replaced++;
    stats.perHex[hex.toLowerCase()] =
      (stats.perHex[hex.toLowerCase()] ?? 0) + 1;
    touched = true;
    return `${prefix}-${token}${opacity}`;
  });
  if (touched && !dry) writeFileSync(file, out);
  if (touched) stats.files++;
}

walk(ROOT);
console.log(
  `migrate-color-tokens: ${dry ? "[DRY] " : ""}${stats.repaired} double-dash repaired, ${stats.replaced} hex classes → tokens in ${stats.files} files`
);
for (const [hex, n] of Object.entries(stats.perHex).sort((a, b) => b[1] - a[1]))
  console.log(`  #${hex}: ${n}`);
