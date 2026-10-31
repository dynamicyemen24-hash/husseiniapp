import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./_core/app";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      server =>
        new Promise<void>((resolve, reject) => {
          server.close(err => (err ? reject(err) : resolve()));
        })
    )
  );
});

describe("performance endpoint", () => {
  it("exposes runtime performance metrics and request ids", async () => {
    const app = createApp();
    const server = createServer(app);
    servers.push(server);

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("server did not bind to a TCP port");
    }

    const res = await fetch(`http://127.0.0.1:${address.port}/api/performance`);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.caches)).toBe(true);
    expect(typeof json.uptime).toBe("number");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});
