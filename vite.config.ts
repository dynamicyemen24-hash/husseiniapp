import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { sentryVitePlugin } from "@sentry/bundler-plugins/vite";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map(entry => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

const plugins = [
  react(),
  tailwindcss(),
  // Sentry source map upload (production only)
  ...(process.env.NODE_ENV === "production" && process.env.SENTRY_AUTH_TOKEN
    ? [
        sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          sourcemaps: {
            assets: "./dist/**",
          },
        }) as any,
      ]
    : []),
  // Dev-only instrumentation — excluded from production builds
  ...(process.env.NODE_ENV === "production"
    ? []
    : [
        jsxLocPlugin(),
        vitePluginManusRuntime(),
        vitePluginManusDebugCollector(),
      ]),
];

/**
 * emitSpaShell — يُنشئ `index.html` داخل مجلد إخراج كل هدف.
 * ==========================================================================
 * البناء هنا يستخدم مدخل JavaScript (`main.app.tsx` / `main.marketing.tsx`)
 * بدل `index.html`، وVite لا يُنتج ملف HTML في هذه الحالة. النتيجة:
 * لا يوجد `index.html` في `dist/app` ولا `dist/marketing` — بينما:
 *   • Vercel يعيد التوجيه `/(.*) → /index.html` (بلا ملف = 404 لكل الصفحات)
 *   • خادم Express يخدم `dist/public` (مجلد فارغ)
 *
 * هذا المكوّن يبني صدفة التطبيق من المصدر الوحيد `client/index.html`
 * (SEO + PWA + splash + تفضيل اللغة قبل أول رسم) مع حقن حزمة الدخول
 * وأنماط CSS المولّدة بالـ hash.
 */
function emitSpaShell(): Plugin {
  const templatePath = path.resolve(
    import.meta.dirname,
    "client",
    "index.html"
  );

  return {
    name: "emit-spa-shell",
    apply: "build",
    generateBundle(_options, bundle) {
      const outputs = Object.values(bundle);
      const entry = outputs.find(
        o => o.type === "chunk" && (o as any).isEntry
      ) as any;

      if (!entry) {
        this.error("emit-spa-shell: لم يُعثر على نقطة الدخول (entry chunk)");
        return;
      }

      // أنماط CSS المرتبطة بنقطة الدخول (Vite يجمعها في ملف واحد عادةً)
      const importedCss: string[] = Array.from(
        entry.viteMetadata?.importedCss ?? []
      ).filter(Boolean) as string[];
      const cssFiles = importedCss.length
        ? importedCss
        : outputs
            .filter(o => o.type === "asset" && o.fileName.endsWith(".css"))
            .map(o => o.fileName);

      let html = fs.readFileSync(templatePath, "utf8");

      const scriptTag = `<script type="module" src="/${entry.fileName}"></script>`;
      const nextHtml = html.replace(
        /<script type="module" src="\/src\/main\.tsx"><\/script>/,
        scriptTag
      );
      if (nextHtml === html) {
        this.error(
          "emit-spa-shell: لم يُعثر على وسم سكربت الدخول في client/index.html"
        );
        return;
      }
      html = nextHtml;

      if (cssFiles.length > 0) {
        const links = cssFiles
          .map(f => `<link rel="stylesheet" href="/${f}" />`)
          .join("\n    ");
        html = html.replace("</head>", `    ${links}\n  </head>`);
      }

      this.emitFile({ type: "asset", fileName: "index.html", source: html });
    },
  };
}

// Build configuration for marketing site
const marketingConfig = defineConfig({
  plugins: [...plugins, emitSpaShell()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/marketing"),
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      input: {
        main: path.resolve(
          import.meta.dirname,
          "client",
          "src",
          "main.marketing.tsx"
        ),
      },
      output: {
        chunkFileNames: "assets/[name]-[hash:8].js",
        entryFileNames: "assets/[name]-[hash:8].js",
        assetFileNames: "assets/[name]-[hash:8][extname]",
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const pkgPath = id.replace(/\\/g, "/");
          if (
            /node_modules\/(react|react-dom|react-is|scheduler)\//.test(pkgPath)
          )
            return "react";
          if (
            pkgPath.includes("recharts") ||
            pkgPath.includes("/d3-") ||
            pkgPath.includes("victory")
          )
            return "charts";
          if (pkgPath.includes("framer-motion")) return "motion";
          if (
            pkgPath.includes("@radix-ui") ||
            pkgPath.includes("cmdk") ||
            pkgPath.includes("vaul") ||
            pkgPath.includes("input-otp") ||
            pkgPath.includes("react-day-picker") ||
            pkgPath.includes("sonner") ||
            pkgPath.includes("react-resizable-panels") ||
            pkgPath.includes("embla-carousel")
          )
            return "ui";
          if (
            pkgPath.includes("zod") ||
            pkgPath.includes("superjson") ||
            pkgPath.includes("date-fns") ||
            pkgPath.includes("clsx") ||
            pkgPath.includes("tailwind-merge") ||
            pkgPath.includes("class-variance-authority") ||
            pkgPath.includes("nanoid") ||
            pkgPath.includes("wouter") ||
            pkgPath.includes("next-themes")
          )
            return "utils";
          return "vendor";
        },
      },
    },
    reportCompressedSize: true,
  },
  server: {
    host: true,
    hmr: false,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    headers: {
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "framer-motion", "lucide-react"],
    force: false,
  },
  worker: {
    format: "es",
  },
});

// Build configuration for app
const appConfig = defineConfig({
  plugins: [...plugins, emitSpaShell()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/app"),
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      input: {
        main: path.resolve(
          import.meta.dirname,
          "client",
          "src",
          "main.app.tsx"
        ),
      },
      output: {
        chunkFileNames: "assets/[name]-[hash:8].js",
        entryFileNames: "assets/[name]-[hash:8].js",
        assetFileNames: "assets/[name]-[hash:8][extname]",
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const pkgPath = id.replace(/\\/g, "/");
          if (
            /node_modules\/(react|react-dom|react-is|scheduler)\//.test(pkgPath)
          )
            return "react";
          if (
            pkgPath.includes("recharts") ||
            pkgPath.includes("/d3-") ||
            pkgPath.includes("victory")
          )
            return "charts";
          if (pkgPath.includes("framer-motion")) return "motion";
          if (
            pkgPath.includes("@trpc") ||
            pkgPath.includes("@tanstack/react-query")
          )
            return "trpc";
          if (
            pkgPath.includes("react-hook-form") ||
            pkgPath.includes("@hookform")
          )
            return "forms";
          if (
            pkgPath.includes("@radix-ui") ||
            pkgPath.includes("cmdk") ||
            pkgPath.includes("vaul") ||
            pkgPath.includes("input-otp") ||
            pkgPath.includes("react-day-picker") ||
            pkgPath.includes("sonner") ||
            pkgPath.includes("react-resizable-panels") ||
            pkgPath.includes("embla-carousel")
          )
            return "ui";
          if (
            pkgPath.includes("zod") ||
            pkgPath.includes("superjson") ||
            pkgPath.includes("date-fns") ||
            pkgPath.includes("clsx") ||
            pkgPath.includes("tailwind-merge") ||
            pkgPath.includes("class-variance-authority") ||
            pkgPath.includes("nanoid") ||
            pkgPath.includes("wouter") ||
            pkgPath.includes("next-themes")
          )
            return "utils";
          return "vendor";
        },
      },
    },
    reportCompressedSize: true,
  },
  server: {
    host: true,
    hmr: false,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    headers: {
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "framer-motion", "lucide-react"],
    force: false,
  },
  worker: {
    format: "es",
  },
});

// Export based on BUILD_TARGET env var
const target = process.env.BUILD_TARGET || "app";

export default target === "marketing" ? marketingConfig : appConfig;
