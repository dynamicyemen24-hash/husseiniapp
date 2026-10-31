#!/usr/bin/env tsx
/**
 * i18n Extraction Script
 * Scans source files for translation keys and hardcoded Arabic strings,
 * generates 25 namespace JSON files per locale.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join, extname, relative } from "path";
import { globSync } from "glob";

interface ExtractedKey {
  key: string;
  namespace: string;
  defaultValue?: string;
  locations: string[];
}

interface NamespaceData {
  [key: string]: string | NamespaceData;
}

const NAMESPACES = [
  "common",
  "navigation",
  "auth",
  "dashboard",
  "sales",
  "inventory",
  "accounting",
  "hr",
  "procurement",
  "workflow",
  "settings",
  "errors",
  "validation",
  "reports",
  "pos",
  "notifications",
  "emails",
  "date",
  "number",
  "currency",
  "units",
  "roles",
  "permissions",
  "audit",
  "backup",
] as const;

type Namespace = (typeof NAMESPACES)[number];

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

// Patterns to find translation usage
const T_FUNCTION_PATTERN = /t\(['"`]([^'"`]+)['"`](?:,\s*\{[^}]*\})?\)/g;
const USE_TRANSLATION_PATTERN = /useTranslation\(['"`]([^'"`]+)['"`]\)/g;
const TRANS_COMPONENT_PATTERN = /<Trans[^>]*i18nKey=['"`]([^'"`]+)['"`]/g;

// Pattern to find hardcoded Arabic strings in JSX/template literals
const ARABIC_STRING_PATTERN = /['"`]([أ-ي\s\d\p{P}]{3,})['"`]/gu;

// Files/directories to ignore
const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".turbo",
  "*.test.ts",
  "*.test.tsx",
  "*.spec.ts",
  "*.spec.tsx",
  "*.d.ts",
  "locales",
  "scripts",
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getNamespaceFromPath(filePath: string): Namespace {
  const pathParts = filePath.split(/[\\/]/);

  // Check for module-specific paths
  if (pathParts.includes("pos") || pathParts.includes("POS")) return "pos";
  if (pathParts.includes("sales")) return "sales";
  if (pathParts.includes("inventory")) return "inventory";
  if (pathParts.includes("accounting")) return "accounting";
  if (pathParts.includes("hr") || pathParts.includes("HR")) return "hr";
  if (pathParts.includes("procurement")) return "procurement";
  if (pathParts.includes("workflow")) return "workflow";
  if (pathParts.includes("settings")) return "settings";
  if (pathParts.includes("dashboard")) return "dashboard";
  if (pathParts.includes("reports")) return "reports";
  if (
    pathParts.includes("auth") ||
    pathParts.includes("login") ||
    pathParts.includes("register")
  )
    return "auth";
  if (
    pathParts.includes("navigation") ||
    pathParts.includes("sidebar") ||
    pathParts.includes("header")
  )
    return "navigation";
  if (pathParts.includes("notification")) return "notifications";
  if (pathParts.includes("email")) return "emails";
  if (pathParts.includes("error")) return "errors";
  if (pathParts.includes("validation") || pathParts.includes("validator"))
    return "validation";
  if (pathParts.includes("role") || pathParts.includes("permission"))
    return "roles";
  if (pathParts.includes("audit")) return "audit";
  if (pathParts.includes("backup")) return "backup";
  if (pathParts.includes("date") || pathParts.includes("time")) return "date";
  if (
    pathParts.includes("number") ||
    pathParts.includes("currency") ||
    pathParts.includes("format")
  )
    return "currency";
  if (pathParts.includes("unit")) return "units";

  return "common";
}

function extractKeysFromFile(
  filePath: string,
  content: string
): ExtractedKey[] {
  const keys: ExtractedKey[] = [];
  const namespace = getNamespaceFromPath(filePath);

  // Extract t('key') calls
  let match;
  while ((match = T_FUNCTION_PATTERN.exec(content)) !== null) {
    const key = match[1];
    if (key && !key.includes("{") && !key.includes("}")) {
      keys.push({
        key,
        namespace,
        locations: [filePath],
      });
    }
  }

  // Extract useTranslation('namespace') calls
  while ((match = USE_TRANSLATION_PATTERN.exec(content)) !== null) {
    const ns = match[1] as Namespace;
    if (NAMESPACES.includes(ns)) {
      // This indicates the file uses this namespace
    }
  }

  // Extract <Trans i18nKey="key" /> components
  while ((match = TRANS_COMPONENT_PATTERN.exec(content)) !== null) {
    const key = match[1];
    keys.push({
      key,
      namespace,
      locations: [filePath],
    });
  }

  // Extract hardcoded Arabic strings (potential translation candidates)
  while ((match = ARABIC_STRING_PATTERN.exec(content)) !== null) {
    const arabicText = match[1].trim();
    if (arabicText.length > 2 && !arabicText.match(/^[أ-ي\s\d\p{P}]+$/u))
      continue;

    // Generate a key from the Arabic text
    const key = generateKeyFromArabic(arabicText);
    keys.push({
      key,
      namespace,
      defaultValue: arabicText,
      locations: [filePath],
    });
  }

  return keys;
}

function generateKeyFromArabic(text: string): string {
  // Convert Arabic text to a reasonable key
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map(word => word.toLowerCase())
    .join("_")
    .substring(0, 50);
}

function setNestedValue(obj: NamespaceData, key: string, value: string): void {
  const parts = key.split(".");
  let current: any = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

function mergeKeys(keys: ExtractedKey[]): Map<Namespace, NamespaceData> {
  const namespaceMap = new Map<Namespace, NamespaceData>();

  for (const ns of NAMESPACES) {
    namespaceMap.set(ns, {});
  }

  // Group by namespace and key
  const keyMap = new Map<string, Map<Namespace, ExtractedKey>>();

  for (const key of keys) {
    if (!keyMap.has(key.key)) {
      keyMap.set(key.key, new Map());
    }
    const nsMap = keyMap.get(key.key)!;

    if (!nsMap.has(key.namespace) || key.defaultValue) {
      nsMap.set(key.namespace, key);
    }
  }

  // Build namespace data
  for (const [key, nsMap] of keyMap) {
    for (const [ns, extractedKey] of nsMap) {
      const nsData = namespaceMap.get(ns)!;
      const value = extractedKey.defaultValue || key;
      setNestedValue(nsData, key, value);
    }
  }

  return namespaceMap;
}

function loadExistingLocale(
  locale: "ar" | "en",
  namespace: Namespace
): NamespaceData {
  const filePath = join(__dirname, "../locales", locale, `${namespace}.json`);
  if (existsSync(filePath)) {
    try {
      return JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function deepMerge(
  target: NamespaceData,
  source: NamespaceData
): NamespaceData {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = deepMerge(
        (target[key] as NamespaceData) || {},
        value as NamespaceData
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

function sortObjectKeys(obj: NamespaceData): NamespaceData {
  const sorted: NamespaceData = {};
  for (const key of Object.keys(obj).sort()) {
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sorted[key] = sortObjectKeys(value as NamespaceData);
    } else {
      sorted[key] = value;
    }
  }
  return sorted;
}

async function main() {
  console.warn("🔍 Starting i18n extraction...");

  // Scan source directories
  const sourceDirs = ["client/src", "server", "packages"];

  const allKeys: ExtractedKey[] = [];

  for (const dir of sourceDirs) {
    const fullDir = join(process.cwd(), dir);
    if (!existsSync(fullDir)) continue;

    const files = globSync("**/*.{ts,tsx,js,jsx}", {
      cwd: fullDir,
      ignore: IGNORE_PATTERNS.map(p => `**/${p}`),
      absolute: true,
    });

    console.warn(`📁 Scanning ${dir}: ${files.length} files`);

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");
        const keys = extractKeysFromFile(file, content);
        allKeys.push(...keys);
      } catch (err) {
        console.warn(`⚠️ Failed to parse ${file}:`, err);
      }
    }
  }

  console.warn(`📝 Found ${allKeys.length} translation keys`);

  // Merge and organize by namespace
  const namespaceData = mergeKeys(allKeys);

  // Write locale files for both Arabic and English
  for (const locale of ["ar", "en"] as const) {
    console.warn(`\n🌐 Generating ${locale} locale files...`);

    for (const ns of NAMESPACES) {
      const existing = loadExistingLocale(locale, ns);
      const extracted = namespaceData.get(ns) || {};
      const merged = deepMerge(existing, extracted);
      const sorted = sortObjectKeys(merged);

      const outputDir = join(__dirname, "../locales", locale);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = join(outputDir, `${ns}.json`);
      writeFileSync(outputPath, JSON.stringify(sorted, null, 2), "utf-8");

      const keyCount = countKeys(sorted);
      console.warn(`  ✅ ${ns}.json (${keyCount} keys)`);
    }
  }

  // Generate TypeScript types for translation keys
  generateTypes(namespaceData);

  console.warn("\n✨ Extraction complete!");
}

function countKeys(obj: NamespaceData): number {
  let count = 0;
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      count += countKeys(value as NamespaceData);
    } else {
      count++;
    }
  }
  return count;
}

function generateTypes(namespaceData: Map<Namespace, NamespaceData>) {
  console.warn("\n📝 Generating TypeScript types...");

  let typesContent = "// Auto-generated from i18n extraction\n";
  typesContent += "// Do not edit manually\n\n";

  typesContent +=
    "import type { LanguageCode } from '@alhusseiniya/types/common';\n\n";

  typesContent += "export type Namespace = \n";
  for (const ns of NAMESPACES) {
    typesContent += `  | '${ns}'\n`;
  }
  typesContent += ";\n\n";

  // Generate key types for each namespace
  for (const ns of NAMESPACES) {
    const data = namespaceData.get(ns) || {};
    const keys = flattenKeys(data);

    typesContent += `export type ${capitalize(ns)}Keys = \n`;
    for (const key of keys.sort()) {
      typesContent += `  | '${key}'\n`;
    }
    typesContent += ";\n\n";
  }

  // Union of all keys
  typesContent += "export type AllTranslationKeys = \n";
  for (const ns of NAMESPACES) {
    typesContent += `  | ${capitalize(ns)}Keys\n`;
  }
  typesContent += ";\n";

  const typesPath = join(__dirname, "../src/types.generated.ts");
  writeFileSync(typesPath, typesContent, "utf-8");
  console.warn(`  ✅ types.generated.ts`);
}

function flattenKeys(obj: NamespaceData, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as NamespaceData, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

main().catch(console.error);
