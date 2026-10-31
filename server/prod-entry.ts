import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "./_core/app";
import { serveStatic } from "./_core/static";

const app = createApp();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, "0.0.0.0", () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const server = createServer(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

process.on("uncaughtException", err => {
  console.error("[ProdServer UncaughtException]", err);
});
process.on("unhandledRejection", reason => {
  console.error("[ProdServer UnhandledRejection]", reason);
});

if (!process.env.VERCEL) {
  serveStatic(app);
  startServer().catch(console.error);
  // Keep event loop active indefinitely in non-interactive background tasks
  setInterval(() => {}, 30000);
}

// Vercel Node runtime requires a default export (function or server/Express app).
export default app;
