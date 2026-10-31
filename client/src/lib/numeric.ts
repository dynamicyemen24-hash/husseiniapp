/**
 * client/src/lib/numeric.ts — Compatibility re-export
 * ==========================================================================
 * The canonical implementation lives in `shared/numeric.ts` so the server
 * and client share the same rules (number conversion, tolerance, rounding) —
 * a single source of truth. This file remains as a compatibility bridge for
 * every existing client-side import.
 *
 * @module lib/numeric
 */
export * from "@shared/numeric";