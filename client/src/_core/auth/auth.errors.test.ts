import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import {
  getTrpcErrorCode,
  isTransientAuthError,
  isUnauthorizedError,
} from "./index";

// ---------------------------------------------------------------------------
// tRPC error construction helpers
// ---------------------------------------------------------------------------
type TrpcClientErrorOptions = ConstructorParameters<typeof TRPCClientError>[1];

function makeTrpcError(code: string | undefined, message = "error"): Error {
  const opts = {
    result: {
      error: {
        json: { message, code: -32001, data: { code, httpStatus: 401 } },
        data: code === undefined ? undefined : { code, httpStatus: 401 },
      },
    },
  } as unknown as TrpcClientErrorOptions;
  return new TRPCClientError(message, opts);
}

describe("auth.errors", () => {
  it("extracts the tRPC error code from a TRPCClientError", () => {
    expect(getTrpcErrorCode(makeTrpcError("UNAUTHORIZED"))).toBe(
      "UNAUTHORIZED"
    );
    expect(getTrpcErrorCode(makeTrpcError("FORBIDDEN"))).toBe("FORBIDDEN");
  });

  it("returns null for transport-level failures (no server code)", () => {
    expect(getTrpcErrorCode(new Error("Failed to fetch"))).toBeNull();
    expect(getTrpcErrorCode(makeTrpcError(undefined))).toBeNull();
    expect(getTrpcErrorCode(null)).toBeNull();
    expect(getTrpcErrorCode("boom")).toBeNull();
  });

  it("treats UNAUTHORIZED as definitive, not transient", () => {
    const err = makeTrpcError("UNAUTHORIZED");
    expect(isUnauthorizedError(err)).toBe(true);
    expect(isTransientAuthError(err)).toBe(false);
  });

  it("treats network failures as transient — network failure ≠ logged out", () => {
    const err = new Error("Failed to fetch");
    expect(isUnauthorizedError(err)).toBe(false);
    expect(isTransientAuthError(err)).toBe(true);
  });

  it("marks retryable server conditions as transient", () => {
    expect(isTransientAuthError(makeTrpcError("INTERNAL_SERVER_ERROR"))).toBe(
      true
    );
    expect(isTransientAuthError(makeTrpcError("TOO_MANY_REQUESTS"))).toBe(true);
    expect(isTransientAuthError(makeTrpcError("TIMEOUT"))).toBe(true);
  });

  it("does not treat client errors like FORBIDDEN/BAD_REQUEST as retryable", () => {
    expect(isTransientAuthError(makeTrpcError("FORBIDDEN"))).toBe(false);
    expect(isTransientAuthError(makeTrpcError("BAD_REQUEST"))).toBe(false);
  });
});
