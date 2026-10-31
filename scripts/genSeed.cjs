const fs = require("fs");

const path = require("path");
const RAW = path.resolve(__dirname, "..", "temp");
const accountsRaw = require(path.join(RAW, "accounts_raw.json"))["sheet1.xml"];
const invRaw = require(path.join(RAW, "inventory_raw.json"))["sheet1.xml"];
const svcRaw = require(path.join(RAW, "services_raw.json"))["sheet1.xml"];

const ACC_TYPE = {
  الاصول: "asset",
  الخصوم: "liability",
  المصروفات: "expense",
  الايرادات: "revenue",
};
const norm = s => (s == null ? "" : String(s).trim());
const isBlank = s => {
  const v = norm(s);
  return v === "" || v === "NULL" || v === "null";
};

// ── Accounts ──────────────────────────────────────────────
const accounts = [];
for (const r of accountsRaw) {
  const code = norm(r[5]);
  const name = norm(r[6]);
  if (isBlank(code) || isBlank(name)) continue;
  let parent = norm(r[4]);
  if (isBlank(parent) || parent === "0") parent = null;
  const type = ACC_TYPE[norm(r[13])] || "asset";
  accounts.push({ code, name, parentCode: parent, type });
}

// ── Goods (inventory) ────────────────────────────────────
const goods = [];
let inventoryValue = 0;
for (let i = 1; i < invRaw.length; i++) {
  const r = invRaw[i];
  const code = norm(r[1]);
  const name = norm(r[3]);
  if (isBlank(code) || isBlank(name)) continue;
  const qty = parseFloat(norm(r[7])) || 0;
  const price = parseFloat(norm(r[12])) || parseFloat(norm(r[8])) || 0;
  const unit = norm(r[5]) || "قطعة";
  const location = isBlank(r[4]) ? null : norm(r[4]);
  // opening inventory valuation = quantity * unit price (catalog value)
  inventoryValue += qty * price;
  goods.push({
    code,
    name,
    type: "goods",
    category: "مكتبة الحسينية",
    unit,
    currentStock: qty,
    salePrice: price.toFixed(2),
    purchasePrice: price.toFixed(2),
    location,
  });
}

// ── Services ──────────────────────────────────────────────
const services = [];
for (let i = 1; i < svcRaw.length; i++) {
  const r = svcRaw[i];
  const code = norm(r[0]);
  const name = norm(r[3]);
  if (isBlank(code) || isBlank(name)) continue;
  const price = parseFloat(norm(r[6])) || 0;
  const category = isBlank(r[2]) ? "خدمات متنوعة" : norm(r[2]);
  const description = isBlank(r[5]) ? null : norm(r[5]);
  services.push({
    code,
    name,
    type: "service",
    category,
    unit: "خدمة",
    currentStock: 0,
    salePrice: price.toFixed(2),
    purchasePrice: price.toFixed(2),
    location: null,
    description,
  });
}

// de-dupe by code (keep first)
const dedup = arr => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    if (seen.has(x.code)) continue;
    seen.add(x.code);
    out.push(x);
  }
  return out;
};
const accountsD = dedup(accounts);
const goodsD = dedup(goods);
const servicesD = dedup(services);

const ts = `// AUTO-GENERATED from docs/*.xlsx via scripts/genSeed.cjs — do not edit by hand.
// Migration source: chart_account.xlsx, Library_Inventory_2025.xlsx, Library_Services.xlsx

export const LIBRARY_TENANT_CODE = "HUSSEINIYA_LIBRARY";
export const LIBRARY_TENANT_NAME = "مكتبة الحسينية";
export const LIBRARY_TENANT_CURRENCY = "YER";

export type SeedAccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export interface SeedAccount {
  code: string;
  name: string;
  parentCode: string | null;
  type: SeedAccountType;
}
export interface SeedProduct {
  code: string;
  name: string;
  type: "goods" | "service";
  category: string | null;
  unit: string;
  currentStock: number;
  salePrice: string;
  purchasePrice: string;
  location: string | null;
  description?: string | null;
}

export const libraryAccounts: SeedAccount[] = ${JSON.stringify(accountsD, null, 0)};

export const libraryGoods: SeedProduct[] = ${JSON.stringify(goodsD, null, 0)};

export const libraryServices: SeedProduct[] = ${JSON.stringify(servicesD, null, 0)};

// Total opening inventory valuation (sum of qty * unit price), used to post a
// balanced opening entry: Dr Inventory (asset) / Cr Owner's Capital (equity).
export const libraryInventoryValue: number = ${inventoryValue.toFixed(2)};
`;

fs.writeFileSync("server/seed/libraryTenantData.ts", ts);
console.log(
  `accounts=${accountsD.length} goods=${goodsD.length} services=${servicesD.length} inventoryValue=${inventoryValue.toFixed(
    2
  )}`
);
