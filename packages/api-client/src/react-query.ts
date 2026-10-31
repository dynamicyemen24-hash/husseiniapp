import { createTRPCReact, httpBatchLink, loggerLink } from "@trpc/react-query";
import type { AppRouter } from "@alhusseiniya/types/api";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          if (
            error instanceof Error &&
            error.message.includes("UNAUTHORIZED")
          ) {
            return false;
          }
          return failureCount < 3;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function getTRPCClientOptions(getToken?: () => string | null) {
  return {
    links: [
      loggerLink({
        enabled: opts =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_SYSTEM_URL || ""}/api/trpc`,
        transformer: superjson,
        headers() {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          const token = getToken?.();
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
  };
}

export const TRPCProvider = trpc.Provider;
export const useTRPC = trpc.useClient;
export const useQuery = trpc.useQuery;
export const useMutation = trpc.useMutation;
export const useInfiniteQuery = trpc.useInfiniteQuery;
