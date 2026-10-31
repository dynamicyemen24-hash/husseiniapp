import { toast } from "sonner";

// ── Opening Balances CSV ─────────────────────────────────────────────
// Format: type,code,name,openingBalance[,unit]
// type: "account" | "inventory"
// This parser accepts both Arabic and English headers

export const OPENING_BALANCES_CSV_HEADER = "type,code,name,openingBalance,unit";

// Arabic-to-English header mapping
const OPENING_BALANCES_ALIASES: Record<string, string> = {
  // Account type
  "نوع الحساب": "type",
  نوع: "type",
  // Account code
  "رمز الحساب": "code",
  "كود الحساب": "code",
  كود: "code",
  // Account name
  "اسم الحساب": "name",
  اسم: "name",
  // Opening balance
  "الرصيد الافتتاحي": "openingBalance",
  الرصيد: "openingBalance",
  // Unit (for inventory items)
  "وحدة المخزون": "unit",
  وحدة: "unit",
};

// ── Parse Opening Balances CSV ────────────────────────────────────────
const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
};

const mapArabicOpeningBalancesHeaders = (
  headers: string[]
): Record<string, number> => {
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    if (key in OPENING_BALANCES_ALIASES) {
      colMap[OPENING_BALANCES_ALIASES[key]] = i;
    } else {
      // Keep as lowercase fallback
      colMap[key] = i;
    }
  });
  return colMap;
};

export const parseOpeningBalancesCsv = (
  text: string
): {
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    openingBalance: number;
  }>;
  inventory: Array<{
    code: string;
    name: string;
    type: string;
    unit: string;
    minStock: number;
    currentStock: number;
  }>;
  errors: string[];
} => {
  const accounts: Array<{
    code: string;
    name: string;
    type: string;
    openingBalance: number;
  }> = [];
  const inventory: Array<{
    code: string;
    name: string;
    type: string;
    unit: string;
    minStock: number;
    currentStock: number;
  }> = [];
  const errors: string[] = [];

  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(l => l.trim());

  if (lines.length < 2) {
    toast.error("الملف فارغ أو لا enthält rows");
    return { accounts, inventory, errors };
  }

  // Detect CSV type from header row
  const headerCells = splitCsvLine(lines[0]);
  const headerLower = headerCells.map(h => h.trim().toLowerCase());

  // Check if headers match opening balances format
  const obHeaderMatch = OPENING_BALANCES_CSV_HEADER.split(",").every(h =>
    headerLower.includes(h.trim().toLowerCase())
  );

  let isOpeningBalancesCsv = obHeaderMatch;

  // If not matching by header, try first data row
  if (!isOpeningBalancesCsv && lines.length > 1) {
    const firstData = splitCsvLine(lines[1]);
    if (firstData.length >= 4 && /^\d+(\.\d+)?$/.test(firstData[3])) {
      isOpeningBalancesCsv = true;
    }
  }

  let rowIdx = 1;
  while (rowIdx < lines.length) {
    const cells = splitCsvLine(lines[rowIdx]);
    rowIdx++;

    if (cells.every(c => c === "")) continue;

    if (isOpeningBalancesCsv) {
      // Parse as opening balances row
      // Columns: type(0), code(1), name(2), openingBalance(3), unit(4, optional)
      const type = (cells[0] || "").trim();
      const code = (cells[1] || "").trim();
      const name = (cells[2] || "").trim();
      const openingBalance = Number(String(cells[3] || "0").trim() || "0");
      const unit = (cells[4] || "").trim();

      if (!code || !name) {
        errors.push(`سطر ${rowIdx}: الرمز والاسم إلزاميان`);
        continue;
      }
      if (openingBalance < 0) {
        errors.push(`سطر ${rowIdx}: الرصيد الافتتاحي يجب أن يكون موجباً`);
        continue;
      }

      if (type === "account") {
        accounts.push({ code, name, type, openingBalance });
      } else if (type === "inventory") {
        inventory.push({
          code,
          name,
          type,
          unit: unit || "قطعة",
          minStock: 0,
          currentStock: openingBalance,
        });
      }
    }
  }

  return { accounts, inventory, errors };
};

// ── Template Download ────────────────────────────────────────────────
export const downloadOpeningBalancesTemplate = () => {
  const sampleAccounts = [
    ["1010", "الصندوق الرئيسي", "asset", "5000"],
    ["3010", "رأس المال", "equity", "100000"],
    ["5010", "مصروفات الرواتب", "expense", "20000"],
  ];

  const sampleInventory = [
    ["P001", "دجاج بلدي", "goods", "كيلو", "100"],
    ["S001", "خدمة توصيل", "service", "رحلة", "0"],
  ];

  const lines: string[] = [];

  // Accounts section
  lines.push(OPENING_BALANCES_CSV_HEADER);
  for (const row of sampleAccounts) {
    lines.push(row.map(v => `"${v}"`).join(","));
  }

  // Inventory section
  lines.push(""); // blank separator
  lines.push(OPENING_BALANCES_CSV_HEADER);
  for (const row of sampleInventory) {
    lines.push(row.map(v => `"${v}"`).join(","));
  }

  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "opening_balances_template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast.success("تم تنزيل قالب الأرصدة الافتتاحية للحسابات والمخزون");
};

// ── Main Import CSV Parser ──────────────────────────────────────────
// Tries opening balances first, falls back to product CSV
export const parseImportCsv = (text: string) => {
  const result = parseOpeningBalancesCsv(text);

  if (result.accounts.length === 0 && result.inventory.length === 0) {
    // Fallback - indicate need to use product import
    return { parsed: [], skipped: [], fallbackToProduct: true };
  }

  // Convert to unified parsed format
  const parsed: any[] = [];

  for (const acc of result.accounts) {
    parsed.push({
      table: "accounts",
      payload: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        openingBalance: acc.openingBalance,
        isActive: true,
      },
    });
  }

  for (const inv of result.inventory) {
    parsed.push({
      table: "products",
      payload: {
        code: inv.code,
        name: inv.name,
        type: inv.type,
        unit: inv.unit,
        minStock: inv.minStock,
        currentStock: inv.currentStock,
        isActive: true,
        salePrice: 0,
        purchasePrice: 0,
      },
    });
  }

  return { parsed, skipped: result.errors, fallbackToProduct: false };
};
