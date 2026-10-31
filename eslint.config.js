import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      /*
       * TypeScript Strictness Policy (ratchet: only tighten, never loosen):
       * - no-unused-vars: WARN with argsIgnorePattern for intentional unused.
       *   Catch dead code early; Vite/Rollup tree-shakes but source clarity matters.
       * - no-explicit-any: WARN with fixable patterns. Migrate to `unknown` or generics.
       *   Drizzle dynamic rows: use `type DbRow = InferSelectModel<typeof table>` instead.
       * - ban-ts-comment: WARN. Prefer proper types over suppressions.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    // Operational scripts and agent stubs are intentionally not part of the
    // production web bundle; disable the Node/browser-only lint noise there.
    files: [
      "*.mjs",
      "*.cjs",
      "agents/**/*.ts",
      "agents/**/*.mjs",
      "scripts/**/*.mjs",
      "scripts/**/*.cjs",
      "scripts/agents/**/*.mjs",
      "e2e/**/*.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.nodeBuiltin,
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
      "no-empty": "off",
      "no-undef": "off",
    },
  },
  {
    // k6 load test scripts — use k6 globals (__ENV, console, http, check, sleep, group, etc.)
    files: ["scripts/**/load-test.js"],
    languageOptions: {
      globals: {
        __ENV: "readonly",
        console: "readonly",
        http: "readonly",
        check: "readonly",
        sleep: "readonly",
        group: "readonly",
        Rate: "readonly",
        Trend: "readonly",
        Counter: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "no-undef": "off",
    },
  },
  {
    // Server runtime + migration tooling: console IS the structured logger
    // here (JSON request lines, backup manifests, lifecycle warnings).
    files: ["server/**/*.ts", "scripts/**/*.ts", "shared/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      ".vercel/**",
      ".manus-logs/**",
      "build-output.txt",
      "build-output-*.txt",
      "output.txt",
      "check-output.txt",
      "lint-output.txt",
      "api/**",
      "node_modules/**",
      "client/public/**",
      "drizzle/**",
      "*.config.*",
      "scripts/build-server.cjs",
      "temp/**",
      "lint-*.txt",
      "test-results/**",
      "scripts/_tmpdriftcheck.mts",
    ],
  },
];
