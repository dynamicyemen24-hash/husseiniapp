import { toast } from "sonner";

export const PRODUCT_CSV_HEADER =
  "code,name,type,category,unit,purchasePrice,salePrice,wholesalePrice,minStock,currentStock,barcode";

export const PRODUCT_CSV_ALIASES: Record<string, string> = {
  رمز: "code",
  الكود: "code",
  كود: "code",
  اسم: "name",
  الاسم: "name",
  نوع: "type",
  النوع: "type",
  فئة: "category",
  الفئة: "category",
  وحدة: "unit",
  الوحدة: "unit",
  "سعر الشراء": "purchasePrice",
  شراء: "purchasePrice",
  "سعر البيع": "salePrice",
  بيع: "salePrice",
  "سعر الجملة": "wholesalePrice",
  جملة: "wholesalePrice",
  "حد الإنذار": "minStock",
  "حد التنبيه": "minStock",
  الرصيد: "currentStock",
  المخزون: "currentStock",
  باركود: "barcode",
  الباركود: "barcode",
};

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportProductsCsv = (productsData: any[]) => {
  const lines = [PRODUCT_CSV_HEADER];
  for (const p of productsData) {
    lines.push(
      [
        esc(p.code),
        esc(p.name),
        p.type || "goods",
        esc(p.category),
        esc(p.unit),
        p.purchasePrice,
        p.salePrice,
        p.wholesalePrice ?? p.salePrice,
        p.minStock,
        p.currentStock,
        esc(p.barcode),
      ].join(",")
    );
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast.success(`تم تصدير ${productsData.length} صنفاً/خدمة`);
};

export const downloadProductTemplate = () => {
  const sample = [
    [
      "P001",
      "دجاج بلدي",
      "goods",
      "مواد غذائية",
      "كيلو",
      "1800",
      "2200",
      "2000",
      "5",
      "50",
      "",
    ],
    [
      "S001",
      "خدمة توصيل",
      "service",
      "خدمات",
      "رحلة",
      "0",
      "500",
      "0",
      "0",
      "0",
      "",
    ],
  ]
    .map(row => row.map(esc).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + PRODUCT_CSV_HEADER + "\n" + sample], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "products_template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};

export const parseProductCsv = (
  text: string
): { rows: any[]; errors: string[] } => {
  const rows: any[] = [];
  const errors: string[] = [];
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(l => l.trim());
  if (lines.length < 2) {
    toast.error("الملف فارغ أو لا يحتوي صفوفاً");
    return { rows, errors };
  }
  const splitLine = (ln: string) => {
    const cells: string[] = [];
    let cur = "",
      inQ = false;
    for (const ch of ln) {
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
  const headerCells = splitLine(lines[0]);
  const colMap: string[] = headerCells.map(h => {
    const key = h.trim().toLowerCase();
    return PRODUCT_CSV_ALIASES[h.trim()] || PRODUCT_CSV_ALIASES[key] || key;
  });
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const obj: Record<string, any> = {};
    colMap.forEach((col, ci) => {
      if (col) obj[col] = cells[ci];
    });
    if (!obj.code || !obj.name) {
      errors.push(`سطر ${i + 1}: الرمز والاسم إلزاميان`);
      continue;
    }
    const type = String(obj.type || "goods").trim();
    rows.push({
      code: String(obj.code).trim(),
      name: String(obj.name).trim(),
      type:
        type === "خدمة" || type === "service"
          ? ("service" as const)
          : ("goods" as const),
      category: obj.category ? String(obj.category).trim() : undefined,
      unit: obj.unit ? String(obj.unit).trim() : "قطعة",
      purchasePrice:
        String(obj.purchasePrice ?? obj["سعر الشراء"] ?? "0").trim() || "0",
      salePrice: String(obj.salePrice ?? obj["سعر البيع"] ?? "0").trim() || "0",
      wholesalePrice:
        String(obj.wholesalePrice ?? obj["سعر الجملة"] ?? "0").trim() || "0",
      minStock: Math.max(0, parseInt(String(obj.minStock ?? "0")) || 0),
      currentStock: Math.max(0, parseInt(String(obj.currentStock ?? "0")) || 0),
      barcode: obj.barcode ? String(obj.barcode).trim() : undefined,
    });
  }
  if (errors.length)
    toast.warning(
      `${errors.length} سطراً تم تجاهله: ${errors.slice(0, 3).join("، ") || ""}`
    );
  if (rows.length === 0) toast.error("لا توجد صفوف صالحة للاستيراد");
  else toast.success(`تم قراءة ${rows.length} صفاً صالحاً`);
  return { rows, errors };
};
