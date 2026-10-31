#!/usr/bin/env node
/**
 * enforce-design-system.mjs — بوابة النشر الذكية
 * يمنع النشر إلا بعد ترقية نظام التصميم والثيمات وتعميمها في شاشات العمل
 * يفحص شاشات العمل للتأكد من استخدام التوكنات الدلالية بدل الألوان الحرفية
 */
import fs from "fs";
import path from "path";

const WORK_SCREENS = [
  "client/src/pages/Commercial.tsx",
  "client/src/pages/Inventory.tsx",
  "client/src/pages/ManualJournal.tsx",
  "client/src/pages/Customization.tsx",
  "client/src/pages/Branches.tsx",
  "client/src/pages/Requisitions.tsx",
  "client/src/pages/Projects.tsx",
  "client/src/modules/pos/POSPage.tsx",
  "client/src/pages/HR.tsx",
  "client/src/pages/SupportQuality.tsx",
  "client/src/pages/Permissions.tsx",
  "client/src/pages/BasicData.tsx",
  "client/src/pages/Journal.tsx",
  "client/src/pages/Audit.tsx",
  "client/src/pages/Beneficiaries.tsx",
  "client/src/pages/Operations.tsx",
  "client/src/pages/Billing.tsx",
  "client/src/pages/CostCenters.tsx",
  "client/src/pages/AdvancedAccountingPage.tsx",
  "client/src/pages/EliasProPage.tsx",
  "client/src/components/WorkContextBar.tsx",
];

const FORBIDDEN = [
  "bg-slate-",
  "text-slate-",
  "border-slate-",
  "bg-gray-",
  "text-gray-",
  "bg-[#",
  "text-[#",
  "border-[#",
];

let failed = false;
let total = 0;

for (const fp of WORK_SCREENS) {
  if (!fs.existsSync(fp)) continue;
  const txt = fs.readFileSync(fp, "utf8");
  for (const pat of FORBIDDEN) {
    if (txt.includes(pat)) {
      const count = (
        txt.match(
          new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
        ) || []
      ).length;
      if (count > 0) {
        console.error(
          `✗ ${fp}: وجد ${count} استخدام محظور "${pat}" — يجب استخدام توكنات دلالية (bg-muted, text-foreground, border-border, bg-card, text-success ...)`
        );
        failed = true;
        total += count;
      }
    }
  }
}

// Check theme coverage: ensure at least 6 themes defined
const themeFile = "client/src/contexts/ThemeContext.tsx";
if (fs.existsSync(themeFile)) {
  const t = fs.readFileSync(themeFile, "utf8");
  const themes = (t.match(/id:\s*"/g) || []).length;
  if (themes < 6) {
    console.error(
      `✗ ${themeFile}: وجد ${themes} ثيمات فقط — المطلوب 6 على الأقل`
    );
    failed = true;
  }
}

// Check design system tokens
const cssFile = "client/src/index.css";
if (fs.existsSync(cssFile)) {
  const css = fs.readFileSync(cssFile, "utf8");
  const required = [
    "--success",
    "--warning",
    "--info",
    "glass-ultra",
    "bento-grid",
    "shadow-modern",
  ];
  for (const tok of required) {
    if (!css.includes(tok)) {
      console.error(
        `✗ ${cssFile}: التوكن "${tok}" مفقود — نظام التصميم غير مكتمل`
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    `\n⛔ بوابة النشر: فشل — وجد ${total} استخدام محظور — يمنع النشر حتى ترقية نظام التصميم وتعميمه بذكاء في شاشات العمل`
  );
  process.exit(1);
} else {
  console.log(
    "✅ بوابة النشر: نجح — نظام التصميم والثيمات معمم بذكاء في جميع شاشات العمل"
  );
}
