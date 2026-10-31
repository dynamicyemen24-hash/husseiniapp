import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@alhusseiniya/design-tokens": path.resolve(
        __dirname,
        "../../packages/design-tokens/src"
      ),
      "@alhusseiniya/types": path.resolve(
        __dirname,
        "../../packages/types/src"
      ),
      "@alhusseiniya/ui-primitives": path.resolve(
        __dirname,
        "../../packages/ui-primitives/src"
      ),
      "@alhusseiniya/api-client": path.resolve(
        __dirname,
        "../../packages/api-client/src"
      ),
      "@alhusseiniya/workflow-engine": path.resolve(
        __dirname,
        "../../packages/workflow-engine/src"
      ),
      "@alhusseiniya/pricing-engine": path.resolve(
        __dirname,
        "../../packages/pricing-engine/src"
      ),
      "@alhusseiniya/i18n": path.resolve(__dirname, "../../packages/i18n/src"),
      "@shared": path.resolve(__dirname, "../../shared"),
    },
  },
  envDir: path.resolve(__dirname, ".."),
  root: __dirname,
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 300,
    sourcemap: "hidden",
    rollupOptions: {
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
  },
  server: {
    host: true,
    port: 3000,
    hmr: { clientPort: 443 },
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      ".system.alhusseiniya.com",
      "localhost",
      "127.0.0.1",
    ],
    fs: { strict: true, deny: ["**/.*"] },
  },
});
