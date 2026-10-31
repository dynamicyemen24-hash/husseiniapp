/**
 * server/_core/migrate.ts
 * ----------------------
 * Pure, testable helpers for the project's SQL-file migration runner.
 */

export const MIGRATION_BREAKPOINT = "--> statement-breakpoint";

export function splitMigrationStatements(sqlText: string): string[] {
  const normalized = sqlText.replaceAll("\r\n", "\n");
  const chunks = normalized
    .split(`${MIGRATION_BREAKPOINT}\n`)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return chunks.flatMap(splitTopLevelStatements);
}

export function isDestructiveMigrationStatement(statement: string): boolean {
  return /^\s*(?:DROP\b|TRUNCATE\b)/i.test(withoutComments(statement));
}

function flushStatement(parts: string[], current: string): void {
  const stmt = current.trim();
  if (stmt.length > 0 && withoutComments(stmt).trim().length > 0) {
    parts.push(stmt.endsWith(";") ? stmt : `${stmt};`);
  }
}

function consumeLineComment(chunk: string, start: number): number {
  const end = chunk.indexOf("\n", start);
  return end === -1 ? chunk.length : end + 1;
}

function consumeBlockComment(chunk: string, start: number): number {
  const end = chunk.indexOf("*/", start + 2);
  return end === -1 ? chunk.length : end + 2;
}

function consumeQuotedString(chunk: string, start: number): number {
  const quote = chunk[start];
  let i = start + 1;

  while (i < chunk.length) {
    if (chunk[i] === quote) {
      if (chunk[i + 1] === quote) {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i++;
  }

  return chunk.length;
}

function consumeDollarQuotedBlock(chunk: string, start: number): number {
  const tagMatch = /^\$(?:\w+)?\$/.exec(chunk.slice(start));
  if (!tagMatch) {
    return start;
  }

  const tag = tagMatch[0];
  const close = chunk.indexOf(tag, start + tag.length);
  return close === -1 ? chunk.length : close + tag.length;
}

function withoutComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function advanceChunkToken(
  chunk: string,
  index: number
): { nextIndex: number; text: string; flush: boolean } {
  const ch = chunk[index];

  if (ch === "-" && chunk[index + 1] === "-") {
    const nextIndex = consumeLineComment(chunk, index);
    return { nextIndex, text: chunk.slice(index, nextIndex), flush: false };
  }

  if (ch === "/" && chunk[index + 1] === "*") {
    const nextIndex = consumeBlockComment(chunk, index);
    return { nextIndex, text: chunk.slice(index, nextIndex), flush: false };
  }

  if (ch === "'" || ch === '"') {
    const nextIndex = consumeQuotedString(chunk, index);
    return { nextIndex, text: chunk.slice(index, nextIndex), flush: false };
  }

  if (ch === "$") {
    const nextIndex = consumeDollarQuotedBlock(chunk, index);
    if (nextIndex > index) {
      return {
        nextIndex,
        text: chunk.slice(index, nextIndex),
        flush: false,
      };
    }
  }

  if (ch === ";") {
    return { nextIndex: index + 1, text: "", flush: true };
  }

  return { nextIndex: index + 1, text: ch, flush: false };
}

function splitTopLevelStatements(chunk: string): string[] {
  const parts: string[] = [];
  let current = "";
  let i = 0;

  while (i < chunk.length) {
    const step = advanceChunkToken(chunk, i);
    current += step.text;
    i = step.nextIndex;

    if (step.flush) {
      flushStatement(parts, current);
      current = "";
    }
  }

  flushStatement(parts, current);
  return parts.length > 0 ? parts : [chunk];
}

const IDEMPOTENT_ERROR_CODES = new Set(["42P07", "42710", "42704"]);

const ALREADY_EXISTS_HINTS = ["already exists", "already used for an index"];

export type MigrationDecision =
  | { kind: "applied" }
  | { kind: "exists"; reason: string }
  | { kind: "failed"; reason: string };

function formatUnknownError(error: unknown): string {
  if (error === null || error === undefined) return "unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  try {
    const json = JSON.stringify(error, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
    return json ?? Object.prototype.toString.call(error);
  } catch {
    return Object.prototype.toString.call(error);
  }
}

export function classifyStatementError(
  error: unknown,
  statement?: string
): MigrationDecision {
  const raw =
    error instanceof Error ? error.message : formatUnknownError(error);
  const codeProp = (error as any)?.code;
  const message =
    typeof codeProp === "string" &&
    /^\d{5}$/.test(codeProp) &&
    !raw.includes(codeProp)
      ? `${raw} (code ${codeProp})`
      : raw;
  const codeMatch = /code '([^']+)'|code (\d{5})/.exec(message);
  const code = codeMatch ? (codeMatch[1] ?? codeMatch[2]) : "";

  if (
    IDEMPOTENT_ERROR_CODES.has(code) ||
    ALREADY_EXISTS_HINTS.some(h => message.includes(h))
  ) {
    return { kind: "exists", reason: message.slice(0, 160) };
  }

  if (
    statement &&
    /^\s*DROP\b/i.test(statement) &&
    message.includes("does not exist")
  ) {
    return { kind: "exists", reason: message.slice(0, 160) };
  }

  return { kind: "failed", reason: message.slice(0, 300) };
}

export function checksumOf(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.codePointAt(i) ?? 0;
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    if (ch > 0xffff) {
      i += 1;
    }
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  const n1 = (h1 ^ (h1 >>> 16)) >>> 0;
  const n2 = (h2 ^ (h2 >>> 16)) >>> 0;
  return n1.toString(16).padStart(8, "0") + n2.toString(16).padStart(8, "0");
}
