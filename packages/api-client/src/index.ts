import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "@alhusseiniya/types/api";

export function createApiClient(options: {
  url: string;
  getToken?: () => string | null;
  headers?: Record<string, string>;
}) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      loggerLink({
        enabled: opts =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: options.url,
        headers() {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...options.headers,
          };
          const token = options.getToken?.();
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          return headers;
        },
        async fetch(url, options) {
          const response = await fetch(url, {
            ...options,
            credentials: "include",
          });
          return response;
        },
      }),
    ],
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
