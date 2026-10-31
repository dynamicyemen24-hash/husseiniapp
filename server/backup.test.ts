/**
 * server/backup.test.ts — unit tests for the encrypted backup primitives.
 * Pure-crypto tests: no database required.
 */

import { afterAll, describe, expect, it } from "vitest";
import {
  decryptPayload,
  encryptPayload,
  resolveBackupSecret,
  sha256Hex,
} from "./_core/backup";
import { ENV } from "./_core/env";

const KEY = "unit-test-master-key-0123456789abcdef";

describe("backup encryption", () => {
  it("round-trips a payload through encrypt/decrypt", () => {
    const plain = Buffer.from(
      "مرحباً — ALHUSAINIA backup payload 12345",
      "utf8"
    );
    const blob = encryptPayload(plain, KEY);
    const decrypted = decryptPayload(blob, KEY);
    expect(decrypted.equals(plain)).toBe(true);
  });

  it("produces different ciphertexts for identical inputs (random salt/iv)", () => {
    const plain = Buffer.from("same input", "utf8");
    const a = encryptPayload(plain, KEY);
    const b = encryptPayload(plain, KEY);
    expect(a.equals(b)).toBe(false);
  });

  it("rejects a wrong key (GCM auth tag mismatch)", () => {
    const plain = Buffer.from("secret data", "utf8");
    const blob = encryptPayload(plain, KEY);
    expect(() => decryptPayload(blob, "wrong-key-0123456789abcdef0")).toThrow();
  });

  it("detects tampered ciphertext (single byte flip)", () => {
    const plain = Buffer.from("tamper me", "utf8");
    const blob = encryptPayload(plain, KEY);
    const copy = Buffer.from(blob);
    copy[copy.length - 1] ^= 0xff;
    expect(() => decryptPayload(copy, KEY)).toThrow();
  });

  it("rejects blobs with a bad magic header", () => {
    const plain = Buffer.from("x", "utf8");
    const blob = encryptPayload(plain, KEY);
    blob[0] = 0x00; // break "ALSBK1\n"
    expect(() => decryptPayload(blob, KEY)).toThrow(/bad magic/);
  });

  it("rejects truncated blobs", () => {
    const blob = encryptPayload(Buffer.from("y", "utf8"), KEY);
    expect(() => decryptPayload(blob.subarray(0, 10), KEY)).toThrow(
      /too short/
    );
  });

  it("sha256Hex is stable and hex-formatted", () => {
    const h1 = sha256Hex(Buffer.from("abc"));
    const h2 = sha256Hex(Buffer.from("abc"));
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("resolveBackupSecret", () => {
  const originalKey = ENV.backupEncryptionKey;
  const originalProd = ENV.isProduction;

  it("returns the configured key when strong enough", () => {
    ENV.backupEncryptionKey = "a-very-strong-production-key-1234";
    ENV.isProduction = true;
    expect(resolveBackupSecret()).toBe("a-very-strong-production-key-1234");
  });

  it("fails closed in production without a configured key", () => {
    ENV.backupEncryptionKey = "";
    ENV.isProduction = true;
    expect(resolveBackupSecret()).toBeNull();
  });

  afterAll(() => {
    ENV.backupEncryptionKey = originalKey;
    ENV.isProduction = originalProd;
  });
});
