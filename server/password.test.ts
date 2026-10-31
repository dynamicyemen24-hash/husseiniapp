import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./_core/password";

describe("hashPassword", () => {
  it("produces a scrypt-formatted hash string", async () => {
    const hash = await hashPassword("mySecretPass123");
    expect(hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  });

  it("includes the scrypt prefix marker", async () => {
    const hash = await hashPassword("anything");
    expect(hash.startsWith("scrypt$")).toBe(true);
  });

  it("generates a unique salt per call (same password → different hashes)", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
    const salt1 = hash1.split("$")[1];
    const salt2 = hash2.split("$")[1];
    expect(salt1).not.toBe(salt2);
  });

  it("is async and returns a string", async () => {
    const result = await hashPassword("test123");
    expect(typeof result).toBe("string");
  });

  it("handles empty password", async () => {
    const hash = await hashPassword("");
    expect(hash).toMatch(/^scrypt\$/);
  });

  it("handles unicode / multi-byte passwords", async () => {
    const hash = await hashPassword("مرحبا123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    const ok = await verifyPassword("مرحبا123", hash);
    expect(ok).toBe(true);
  });
});

describe("verifyPassword", () => {
  it("returns true for a correct password", async () => {
    const hash = await hashPassword("correctPass!");
    const ok = await verifyPassword("correctPass!", hash);
    expect(ok).toBe(true);
  });

  it("returns false for an incorrect password", async () => {
    const hash = await hashPassword("realPassword");
    const ok = await verifyPassword("wrongPassword", hash);
    expect(ok).toBe(false);
  });

  it("returns false for null stored hash", async () => {
    const ok = await verifyPassword("anything", null);
    expect(ok).toBe(false);
  });

  it("returns false for undefined stored hash", async () => {
    const ok = await verifyPassword("anything", undefined);
    expect(ok).toBe(false);
  });

  it("returns false for a malformed hash string", async () => {
    const ok = await verifyPassword("password", "not-a-valid-hash");
    expect(ok).toBe(false);
  });

  it("returns false for a hash with wrong prefix", async () => {
    const ok = await verifyPassword("password", "bcrypt$abcd$efgh");
    expect(ok).toBe(false);
  });

  it("returns false when hash has too few segments", async () => {
    const ok = await verifyPassword("password", "scrypt$onlyonesegment");
    expect(ok).toBe(false);
  });

  it("returns false when salt segment is empty", async () => {
    const ok = await verifyPassword("password", "scrypt$$somehash");
    expect(ok).toBe(false);
  });

  it("returns false when hash segment is empty", async () => {
    const ok = await verifyPassword("password", "scrypt$salt$");
    expect(ok).toBe(false);
  });

  it("round-trips across multiple passwords", async () => {
    for (let i = 0; i < 5; i++) {
      const pass = `pass_${Math.random().toString(36).slice(2)}`;
      const hash = await hashPassword(pass);
      expect(await verifyPassword(pass, hash)).toBe(true);
      expect(await verifyPassword(pass + "x", hash)).toBe(false);
    }
  });

  it("extracts salt and hash correctly from the format scrypt$salt$hash", async () => {
    const hash = await hashPassword("verifyFormat");
    const parts = hash.split("$");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toHaveLength(32);
    expect(parts[1]).toMatch(/^[a-f0-9]+$/);
    expect(parts[2]).toHaveLength(128);
    expect(parts[2]).toMatch(/^[a-f0-9]+$/);
  });
});
