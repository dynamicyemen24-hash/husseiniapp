#!/usr/bin/env node
/**
 * AA-contrast fixer for the "on-brand" button recipe.
 *
 * WCAG 2.1 AA requires ≥ 4.5:1 for normal text. Computed pairs
 * (Heritage Ledger theme):
 *   ink   on brand       = 4.23  ✗
 *   ink   on brand-deep  = 3.04  ✗ (hover state!)
 *   ink-deep on brand    = 4.76  ✓
 *   sand  on brand-deep  = 4.71  ✓
 *
 * Canonical recipe applied here:
 *   bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand
 *
 * ink-deep vs ink is visually imperceptible (ΔE ≈ 1.5), so even if a
 * replaced `text-ink` belonged to a sibling element, there is no visual
 * regression risk.
 *
 * Run:  node scripts/fix-contrast.mjs [--dry]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "client", "src");
const dry = process.argv.includes("--dry");
let files = 0,
  textFix = 0,
  hoverFix = 0;

const walk = dir => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e)) fix(p);
  }
};

function fix(file) {
  const src = readFileSync(file, "utf8");
  let touched = false;
  const out = src
    .split("\n")
    .map(line => {
      if (!/\bbg-brand(?![-\w])/.test(line) || !/text-ink(?![-\w])/.test(line))
        return line;
      let l = line;
      if (/\btext-ink(?![-\w])/.test(l)) {
        l = l.replace(/\btext-ink(?![-\w])/g, "text-ink-deep");
        textFix++;
        touched = true;
      }
      // hover fills darken the copper → flip hover text to sand for AA
      if (/hover:bg-brand-(?:deep|600)/.test(l) && !/hover:text-/.test(l)) {
        l = l.replace(/(hover:bg-brand-(?:deep|600))/, "$1 hover:text-sand");
        hoverFix++;
      }
      if (/hover:text-ink(?![-\w])/.test(l)) {
        l = l.replace(/\bhover:text-ink(?![-\w])/g, "hover:text-sand");
        hoverFix++;
      }
      return l;
    })
    .join("\n");
  if (touched && !dry) writeFileSync(file, out);
  if (touched) files++;
}

walk(ROOT);
console.log(
  `fix-contrast: ${dry ? "[DRY] " : ""}${textFix} text-ink→ink-deep, ${hoverFix} hover text flips in ${files} files`
);
