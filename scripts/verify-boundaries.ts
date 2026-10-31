import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, extname, relative } from "path";

const FORBIDDEN_IMPORTS = [
  { from: "apps/website", to: "apps/system/src" },
  { from: "apps/system", to: "apps/website/src" },
  { from: "apps/website", to: "server/" },
  { from: "apps/system", to: "next/" },
  { from: "apps/website", to: "vite.config" },
  { from: "apps/system", to: "next.config" },
];

const ALLOWED_CROSS_IMPORTS = [
  "@alhusseiniya/design-tokens",
  "@alhusseiniya/types",
  "@alhusseiniya/ui-primitives",
  "@alhusseiniya/api-client",
  "@alhusseiniya/workflow-engine",
  "@alhusseiniya/pricing-engine",
  "@alhusseiniya/i18n",
];

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules" &&
        entry.name !== "dist" &&
        entry.name !== ".next"
      ) {
        files.push(...findFiles(fullPath, extensions));
      }
    } else if (extensions.includes(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkBoundaries(): number {
  let violations = 0;
  const projectRoot = resolve(__dirname, "..");

  for (const { from, to } of FORBIDDEN_IMPORTS) {
    const fromDir = resolve(projectRoot, from);
    if (!statSync(fromDir, { throwIfNoEntry: false })?.isDirectory()) continue;

    const files = findFiles(fromDir, [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
    ]);

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check import statements
        const importMatch = line.match(
          /^import\s+.*\s+from\s+['"]([^'"]+)['"]/
        );
        const requireMatch = line.match(/require\(['"]([^'"]+)['"]\)/);
        const dynamicImportMatch = line.match(/import\(['"]([^'"]+)['"]\)/);

        const importedPath =
          importMatch?.[1] || requireMatch?.[1] || dynamicImportMatch?.[1];

        if (importedPath) {
          // Check if it's a forbidden import
          const isForbidden =
            importedPath.includes(to) ||
            (importedPath.startsWith(".") &&
              importedPath.includes(to.split("/").pop() || ""));

          // Check if it's an allowed cross-import
          const isAllowed = ALLOWED_CROSS_IMPORTS.some(allowed =>
            importedPath.startsWith(allowed)
          );

          if (isForbidden && !isAllowed) {
            const relPath = relative(projectRoot, file);
            console.error(`🚫 BOUNDARY VIOLATION: ${relPath}:${i + 1}`);
            console.error(`   Imports from forbidden path: ${importedPath}`);
            console.error(`   Rule: ${from} → ${to}`);
            violations++;
          }
        }
      }
    }
  }

  return violations;
}

function checkSharedPackageImports(): number {
  let violations = 0;
  const projectRoot = resolve(__dirname, "..");

  // Check that apps only import from shared packages via the @alhusseiniya/* namespace
  const appDirs = ["apps/website", "apps/system"];

  for (const appDir of appDirs) {
    const fullPath = resolve(projectRoot, appDir);
    if (!statSync(fullPath, { throwIfNoEntry: false })?.isDirectory()) continue;

    const files = findFiles(fullPath, [".ts", ".tsx", ".js", ".jsx"]);

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        const importMatch = line.match(
          /^import\s+.*\s+from\s+['"]([^'"]+)['"]/
        );
        const requireMatch = line.match(/require\(['"]([^'"]+)['"]\)/);
        const dynamicImportMatch = line.match(/import\(['"]([^'"]+)['"]\)/);

        const importedPath =
          importMatch?.[1] || requireMatch?.[1] || dynamicImportMatch?.[1];

        if (importedPath && importedPath.startsWith("../packages/")) {
          const relPath = relative(projectRoot, file);
          console.error(`🚫 DIRECT PACKAGE IMPORT: ${relPath}:${i + 1}`);
          console.error(`   Direct import from packages/: ${importedPath}`);
          console.error(`   Use @alhusseiniya/* namespace instead`);
          violations++;
        }
      }
    }
  }

  return violations;
}

console.log("🔍 Verifying architectural boundaries...\n");

const boundaryViolations = checkBoundaries();
const sharedImportViolations = checkSharedPackageImports();

const totalViolations = boundaryViolations + sharedImportViolations;

if (totalViolations > 0) {
  console.error(`\n❌ Found ${totalViolations} boundary violation(s)`);
  process.exit(1);
} else {
  console.log("✅ All architectural boundaries verified successfully");
  process.exit(0);
}
