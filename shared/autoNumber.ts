/**
 * Smart Auto-Numbering System
 * Generates unique, sequential document numbers with configurable prefixes and formats.
 */

export type NumberFormat = {
  prefix: string;
  separator: string;
  yearFormat: "YYYY" | "YY" | "none";
  padding: number;
  sequenceStart: number;
};

export type DocTypeConfig = {
  vouchers: NumberFormat;
  invoices: NumberFormat;
  purchases: NumberFormat;
  sales: NumberFormat;
  journals: NumberFormat;
  requisitions: NumberFormat;
  payments: NumberFormat;
  receipts: NumberFormat;
};

export const DEFAULT_NUMBER_FORMATS: DocTypeConfig = {
  vouchers: {
    prefix: "VCH",
    separator: "-",
    yearFormat: "YYYY",
    padding: 5,
    sequenceStart: 1,
  },
  invoices: {
    prefix: "INV",
    separator: "-",
    yearFormat: "YYYY",
    padding: 5,
    sequenceStart: 1,
  },
  purchases: {
    prefix: "PRC",
    separator: "-",
    yearFormat: "YYYY",
    padding: 5,
    sequenceStart: 1,
  },
  sales: {
    prefix: "SLD",
    separator: "-",
    yearFormat: "YYYY",
    padding: 5,
    sequenceStart: 1,
  },
  journals: {
    prefix: "JRN",
    separator: "-",
    yearFormat: "YYYY",
    padding: 5,
    sequenceStart: 1,
  },
  requisitions: {
    prefix: "REQ",
    separator: "-",
    yearFormat: "YYYY",
    padding: 5,
    sequenceStart: 1,
  },
  payments: {
    prefix: "PAY",
    separator: "-",
    yearFormat: "YYYY",
    padding: 5,
    sequenceStart: 1,
  },
  receipts: {
    prefix: "RCP",
    separator: "-",
    yearFormat: "YYYY",
    padding: 5,
    sequenceStart: 1,
  },
};

export function generateDocNumber(
  type: keyof DocTypeConfig,
  sequence: number,
  year?: number,
  config?: DocTypeConfig
): string {
  const fmt = config?.[type] ?? DEFAULT_NUMBER_FORMATS[type];
  const yr = year ?? new Date().getFullYear();
  const yearStr =
    fmt.yearFormat === "YY"
      ? String(yr).slice(-2)
      : fmt.yearFormat === "none"
        ? ""
        : String(yr);
  const paddedSeq = String(sequence).padStart(fmt.padding, "0");
  return yearStr
    ? `${fmt.prefix}${fmt.separator}${paddedSeq}${fmt.separator}${yearStr}`
    : `${fmt.prefix}${fmt.separator}${paddedSeq}`;
}

export function parseDocNumber(
  docNumber: string,
  type: keyof DocTypeConfig,
  config?: DocTypeConfig
): { prefix: string; sequence: number; year: number | null } {
  const fmt = config?.[type] ?? DEFAULT_NUMBER_FORMATS[type];
  const parts = docNumber.split(fmt.separator);
  const seqIndex = fmt.yearFormat === "none" ? 1 : 2;
  const yearIndex = fmt.yearFormat === "none" ? -1 : 3;

  return {
    prefix: parts[0],
    sequence: parseInt(parts[seqIndex], 10) || 0,
    year: yearIndex > 0 ? parseInt(parts[yearIndex], 10) || null : null,
  };
}

/**
 * Generates next sequence number based on existing documents
 */
export function getNextSequence(
  existingNumbers: string[],
  type: keyof DocTypeConfig
): number {
  const fmt = DEFAULT_NUMBER_FORMATS[type];
  const prefix = fmt.prefix;
  const separator = fmt.separator;
  const yearStr = String(new Date().getFullYear());

  const maxSeq = existingNumbers.reduce((max, num) => {
    if (!num.startsWith(prefix + separator)) return max;
    const parts = num.split(separator);
    const seq = parseInt(parts[1], 10);
    const docYear = parts[2];
    if (fmt.yearFormat !== "none" && docYear !== yearStr) return max;
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);

  return maxSeq + 1;
}
