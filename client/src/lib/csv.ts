function escapeCell(value: unknown): string {
  const raw = String(value ?? "");
  const cell = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${cell.replace(/"/g, '""')}"`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: unknown[][]
): number {
  const head = headers.map(escapeCell).join(",");
  const body = rows.map(r => r.map(escapeCell).join(",")).join("\r\n");
  const content = `\uFEFF${head}\r\n${body}`;
  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return rows.length;
}
