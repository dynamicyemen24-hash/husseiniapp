#!/usr/bin/env node
/**
 * remove-unused.cjs — removes unused import specifiers reported by
 * `tsc --noUnusedLocals` (error TS6133) for import statements only.
 *
 * Usage: node scripts/remove-unused.cjs <tsc-output-file>
 * The output file should contain lines like:
 *   client/src/pages/About.tsx(33,3): error TS6133: 'Compass' is declared but its value is never read.
 *
 * Only import-specifier removals are automated. Other declarations are
 * left for manual review.
 */
const fs = require("fs");
const path = require("path");

const outFile = process.argv[2];
if (!outFile) {
  console.error("Usage: node scripts/remove-unused.cjs <tsc-output-file>");
  process.exit(1);
}

const raw = fs.readFileSync(outFile, "utf-8");
const lines = raw.split(/\r?\n/);

// Collect: file -> Set of unused imported names
const unusedImports = new Map();
const importLineRe =
  /^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read\./;

for (const line of lines) {
  const m = line.match(importLineRe);
  if (!m) continue;
  const [, file, lineNo, col, name] = m;
  // Import specifiers start at column 3 typically (multi-line import) or
  // the whole line is an import (single-line import, col 1).
  // We verify by reading the file later; collect all for now.
  if (!unusedImports.has(file)) unusedImports.set(file, new Map());
  const perLine = unusedImports.get(file);
  const key = `${lineNo}:${col}`;
  if (!perLine.has(key)) perLine.set(key, []);
  perLine.get(key).push(name);
}

let totalRemoved = 0;
let filesChanged = 0;

for (const [file, perLine] of unusedImports) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) continue;
  let src = fs.readFileSync(abs, "utf-8");
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  let srcLines = src.split(/\r?\n/);
  let changed = false;

  // Process from bottom to top so line numbers stay valid.
  const entries = [...perLine.entries()].sort(
    (a, b) => parseInt(b[0]) - parseInt(a[0])
  );

  for (const [key, names] of entries) {
    const [lineNoStr, colStr] = key.split(":");
    const lineNo = parseInt(lineNoStr);
    const col = parseInt(colStr);
    const line = srcLines[lineNo - 1];
    if (line === undefined) continue;

    // Case A: single-line import statement starting at col 1
    //   e.g. `import { toast } from "sonner";` or `import React, { useState } from "react";`
    if (col === 1 && /^\s*import\b/.test(line)) {
      // Determine which names in this import are unused
      const unusedSet = new Set(names);
      // Extract the named-import clause if present
      const namedMatch = line.match(/\{([^}]*)\}/);
      if (namedMatch) {
        const specs = namedMatch[1]
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
        const kept = specs.filter(spec => {
          // spec like `Foo` or `Foo as Bar` — the local binding is what tsc reports
          const local = spec.includes(" as ")
            ? spec.split(" as ")[1].trim()
            : spec;
          return !unusedSet.has(local);
        });
        if (kept.length === 0) {
          // Remove entire import line
          srcLines.splice(lineNo - 1, 1);
          changed = true;
          totalRemoved += specs.length;
        } else if (kept.length !== specs.length) {
          const newLine = line.replace(/\{[^}]*\}/, `{ ${kept.join(", ")} }`);
          srcLines[lineNo - 1] = newLine;
          changed = true;
          totalRemoved += specs.length - kept.length;
        }
      } else {
        // default-only import, e.g. `import React from "react";`
        const defaultName = line.match(/import\s+(\w+)\s+from/);
        if (defaultName && unusedSet.has(defaultName[1])) {
          srcLines.splice(lineNo - 1, 1);
          changed = true;
          totalRemoved += 1;
        }
      }
      continue;
    }

    // Case B: multi-line import — specifier on its own line, col 3
    //   e.g. `  Compass,`
    if (col === 3) {
      const specLine = line.trim();
      // spec like `Compass,` or `Compass as X,`
      const specMatch = specMatch2(specLine, names);
      if (specMatch) {
        srcLines.splice(lineNo - 1, 1);
        changed = true;
        totalRemoved += 1;
      }
      continue;
    }
  }

  // Cleanup: collapse import blocks that now have empty `{ }` or dangling braces
  if (changed) {
    src = srcLines.join(eol);
    src = cleanupEmptyImports(src);
    fs.writeFileSync(abs, src, "utf-8");
    filesChanged++;
    console.log(`cleaned: ${file}`);
  }
}

function specMatch2(trimmed, names) {
  // trimmed like `Compass,` / `Compass as Bar,` / `Compass`
  const m = trimmed.match(/^(\w+)(?:\s+as\s+(\w+))?,?$/);
  if (!m) return false;
  const local = m[2] || m[1];
  return names.includes(local);
}

function cleanupEmptyImports(src) {
  // Remove `import {  } from "x";` and multi-line imports whose braces became empty
  let out = src.replace(
    /import\s*\{\s*\}\s*from\s*["'][^"']+["'];?\r?\n?/g,
    ""
  );
  // Multi-line: `import type {\n} from "...";` — braces on separate lines
  out = out.replace(
    /import\s+(?:type\s+)?\{\s*\r?\n\s*\}\s*from\s*["'][^"']+["'];?\r?\n?/g,
    ""
  );
  return out;
}

console.log(
  `\nDone. Removed ${totalRemoved} unused import specifier(s) across ${filesChanged} file(s).`
);
