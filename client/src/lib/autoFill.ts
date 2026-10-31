/**
 * Auto-fill utilities for common form patterns.
 */

import { useState, useCallback, useMemo } from "react";

export function useAutoNumber(
  prefix: string,
  yearFormat: "YYYY" | "YY" | "none" = "YYYY",
  padding = 5
) {
  const sequence = 1;
  const number = useMemo(() => {
    const year = new Date().getFullYear();
    const yr =
      yearFormat === "YY"
        ? String(year).slice(-2)
        : yearFormat === "none"
          ? ""
          : String(year);
    const padded = String(sequence).padStart(padding, "0");
    return yearFormat === "none"
      ? `${prefix}-${padded}`
      : `${prefix}-${padded}-${yr}`;
  }, [prefix, sequence, yearFormat, padding]);
  return { number };
}

export function useSmartForm<T extends Record<string, unknown>>(
  initialValues: T
) {
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState(true);

  const setValue = useCallback((field: string, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const markSaved = useCallback(() => {
    setSaved(true);
  }, []);

  return { values, setValue, saved, isDirty: !saved, markSaved };
}

export function autoRound(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

export function generateBarcode(prefix = "PRD"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function validateBalance(
  debit: number,
  credit: number
): { balanced: boolean; difference: number } {
  const diff = debit - credit;
  return { balanced: Math.abs(diff) < 0.01, difference: diff };
}
