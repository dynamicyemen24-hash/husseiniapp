import { describe, expect, it } from "vitest";
import {
  checksumOf,
  classifyStatementError,
  isDestructiveMigrationStatement,
  splitMigrationStatements,
} from "./_core/migrate";

describe("splitMigrationStatements", () => {
  it("splits LF-terminated breakpoints", () => {
    const text =
      'CREATE TABLE "a" (id serial);--> statement-breakpoint\nALTER TABLE "b" ADD COLUMN c int;';
    const parts = splitMigrationStatements(text);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("CREATE TABLE");
    expect(parts[1]).toContain("ALTER TABLE");
  });

  it("splits CRLF-terminated breakpoints (Windows)", () => {
    const text =
      'CREATE TABLE "a" (id serial);--> statement-breakpoint\r\nALTER TABLE "b" ADD COLUMN c int;--> statement-breakpoint\r\nDROP TABLE "c";';
    const parts = splitMigrationStatements(text);
    expect(parts).toHaveLength(3);
    expect(parts[2]).toBe('DROP TABLE "c";');
  });

  it("returns a single statement when there is no breakpoint", () => {
    expect(splitMigrationStatements("SELECT 1;")).toEqual(["SELECT 1;"]);
  });

  it("drops empty trailing segments", () => {
    const text = 'CREATE TABLE "a" (id serial);--> statement-breakpoint\n';
    expect(splitMigrationStatements(text)).toHaveLength(1);
  });

  it("survives a migration file with many statements", () => {
    const stmts = Array.from({ length: 500 }, (_, i) => `SELECT ${i};`);
    const text = stmts.join("--> statement-breakpoint\n");
    expect(splitMigrationStatements(text)).toHaveLength(500);
  });

  it("splits hand-written statements separated by top-level semicolons", () => {
    const text = `CREATE INDEX "idx_a" ON "t" ("x");\nCREATE INDEX "idx_b" ON "t" ("y");\nALTER TABLE "t" SET (autovacuum_vacuum_scale_factor = 0.05);`;
    const parts = splitMigrationStatements(text);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toContain("idx_a");
    expect(parts[2]).toContain("autovacuum_vacuum_scale_factor");
  });

  it("does NOT split inside dollar-quoted plpgsql bodies", () => {
    const text = [
      "CREATE OR REPLACE FUNCTION refresh_views() RETURNS void AS $$",
      "BEGIN",
      "REFRESH MATERIALIZED VIEW mv_a;",
      "REFRESH MATERIALIZED VIEW mv_b;",
      "END;",
      "$$ LANGUAGE plpgsql;",
      "COMMENT ON MATERIALIZED VIEW \"mv_a\" IS 'x; y; z';",
    ].join("\n");
    const parts = splitMigrationStatements(text);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("LANGUAGE plpgsql");
    expect(parts[0]).toContain("mv_b;");
    expect(parts[1]).toContain("COMMENT ON");
  });

  it("does NOT split inside DO $$ … $$ blocks", () => {
    const text = [
      "DO $$ BEGIN",
      "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'c') THEN",
      'ALTER TABLE "t" ADD CONSTRAINT "c" CHECK ("a" >= 0);',
      "END IF;",
      "END $$;",
      'CREATE INDEX "idx_c" ON "t" ("a");',
    ].join("\n");
    const parts = splitMigrationStatements(text);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("END $$;");
    expect(parts[1]).toContain("idx_c");
  });

  it("handles string literals containing semicolons and comments", () => {
    const text = `INSERT INTO "t" ("note") VALUES ('a; b -- not a comment');\n-- a standalone comment\nCREATE INDEX "idx_d" ON "t" ("a");`;
    const parts = splitMigrationStatements(text);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("'a; b -- not a comment'");
  });
});

describe("classifyStatementError", () => {
  it("classifies duplicate table (42P07) as exists", () => {
    const err = new Error('relation "accounts" already exists (code 42P07)');
    expect(classifyStatementError(err)).toMatchObject({ kind: "exists" });
  });

  it("classifies duplicate object (42710) as exists", () => {
    const err = new Error('index "idx_x" already exists (code 42710)');
    expect(classifyStatementError(err)).toMatchObject({ kind: "exists" });
  });

  it("classifies plain english 'already exists' as exists", () => {
    expect(
      classifyStatementError(new Error("relation already exists"))
    ).toMatchObject({
      kind: "exists",
    });
  });

  it("does not hide unique data conflicts", () => {
    const err = new Error(
      'duplicate key value violates unique constraint "x" (code 23505)'
    );
    expect(classifyStatementError(err)).toMatchObject({ kind: "failed" });
  });

  it("classifies a genuine failure as failed", () => {
    const err = new Error('syntax error at or near "SELEC" (code 42601)');
    expect(classifyStatementError(err)).toMatchObject({ kind: "failed" });
  });

  it("classifies undefined column as failed", () => {
    expect(
      classifyStatementError(
        new Error('column "missing" does not exist (code 42703)')
      )
    ).toMatchObject({ kind: "failed" });
  });

  it("handles non-Error inputs", () => {
    expect(classifyStatementError(undefined)).toMatchObject({ kind: "failed" });
    expect(classifyStatementError("boom")).toMatchObject({ kind: "failed" });
  });
});

describe("migration safety", () => {
  it("rejects destructive statements", () => {
    expect(isDestructiveMigrationStatement("DROP TABLE accounts;")).toBe(true);
    expect(isDestructiveMigrationStatement("TRUNCATE transactions;")).toBe(
      true
    );
    expect(
      isDestructiveMigrationStatement(
        "ALTER TABLE accounts ADD COLUMN note text;"
      )
    ).toBe(false);
  });
});

describe("checksumOf", () => {
  it("is stable for identical input", () => {
    const text = "CREATE TABLE x (a int);";
    expect(checksumOf(text)).toBe(checksumOf(text));
  });

  it("changes when content changes", () => {
    expect(checksumOf("a;")).not.toBe(checksumOf("a; "));
  });

  it("returns 16 lowercase hex chars", () => {
    expect(checksumOf("anything")).toMatch(/^[0-9a-f]{16}$/);
  });
});
