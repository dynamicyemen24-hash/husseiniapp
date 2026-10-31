// Fix remaining corrupted lines by line number (deterministic).
// Usage: node scripts/fix-lines.cjs
const fs = require("fs");
const NL = String.fromCharCode(10);
const p = "client/src/pages/Landing.tsx";

// [lineNumber(1-based), correctTrimmedText]
const fixes = [
  [
    120,
    'desc: "قيد مزدوج، دليل حسابات شجري، فواتير، تقارير مالية فورية، وإقفال سنوي تلقائي.",',
  ],
  [
    128,
    'desc: "مخططات تنفيذية، رفع مساحي رقمي، جداول كميات BOQ، وإشراف ميداني للمشاريع.",',
  ],
  [
    136,
    'desc: "فواتير مبيعات ومشتريات، إدارة مخزون ذكية، وربط المتجر الإلكتروني آلياً.",',
  ],
  [144, 'desc: "طباعة وتغليف، تصاميم إبداعية، أبحاث أكاديمية، وصيانة أجهزة.",'],
  [175, 'title: "دفع مرن محلي",'],
  [592, '<Label className="text-xs font-bold text-foreground">الاسم *</Label>'],
  [
    602,
    '<Label className="text-xs font-bold text-foreground">رقم الهاتف *</Label>',
  ],
  [
    720,
    '<Label className="text-xs font-bold text-foreground">الاسم الكامل *</Label>',
  ],
  [
    731,
    '<Label className="text-xs font-bold text-foreground">رقم الهاتف / الواتساب *</Label>',
  ],
  [766, "إلغاء"],
];

let c = fs.readFileSync(p, "utf8");
const lines = c.split(NL);

for (const [num, text] of fixes) {
  const idx = num - 1;
  const orig = lines[idx];
  if (orig === undefined) {
    console.log(`SKIP ${num}: out of range`);
    continue;
  }
  // Preserve leading indentation of the original line
  const indentMatch = orig.match(/^[\t ]*/);
  const indent = indentMatch ? indentMatch[0] : "";
  lines[idx] = indent + text;
  console.log(`FIXED ${num}`);
}

fs.writeFileSync(p, lines.join(NL));
console.log("DONE");
