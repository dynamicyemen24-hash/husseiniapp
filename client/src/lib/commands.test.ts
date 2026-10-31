import { describe, it, expect } from "vitest";
import {
  WORK_COMMANDS,
  COMMAND_INTENT_LABELS,
  COMMAND_INTENT_ORDER,
  filterCommandsForRole,
  sortCommands,
  groupCommandsByIntent,
  type CommandIntent,
} from "./commands";
import { ROLE_DEFINITIONS, type RoleCode } from "@shared/permissions";

/**
 * سجل أوامر العمل — قفل سلوكه لأن شريط الأوامر ولوحة Ctrl+K
 * يستهلكان نفس المصدر. أي انحراف هنا يعني أن أحدهما يعرض
 * نوايا لا يملكها المستخدم.
 */
const canForRole = (role: RoleCode) => {
  const granted = new Set<string>(
    ROLE_DEFINITIONS[role].permissions as readonly string[]
  );
  return (permission: string) => granted.has(permission);
};

describe("سجل أوامر العمل", () => {
  it("يحتوي معرّفات فريدة ومسارات تبدأ بـ /", () => {
    const ids = WORK_COMMANDS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const command of WORK_COMMANDS) {
      expect(command.path.startsWith("/")).toBe(true);
      expect(command.label.trim().length).toBeGreaterThan(0);
      expect(command.hint.trim().length).toBeGreaterThan(0);
    }
  });

  it("لا يكرر نفس المسار بين أمرين مختلفين", () => {
    const paths = WORK_COMMANDS.map(c => `${c.intent}:${c.path}`);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("يغطي كل نية مصرّحة في COMMAND_INTENT_ORDER", () => {
    const intents = new Set(WORK_COMMANDS.map(c => c.intent));
    for (const intent of COMMAND_INTENT_ORDER) {
      expect(intents.has(intent)).toBe(true);
      expect(COMMAND_INTENT_LABELS[intent]).toBeTruthy();
    }
  });

  it("يخفي الأوامر التي لا يملك الدور صلاحيتها", () => {
    const userCommands = filterCommandsForRole(
      WORK_COMMANDS,
      canForRole("user")
    );
    const labels = userCommands.map(c => c.id);

    // المستخدم العادي لا يملك إنشاء قيد ولا إدارة المبيعات
    expect(labels).not.toContain("journal.manual");
    expect(labels).not.toContain("commerce.sale");
    expect(labels).not.toContain("gov.permissions");
  });

  it("المحاسب يرى النوايا المالية لا نوايا البيع", () => {
    const accountant = filterCommandsForRole(
      WORK_COMMANDS,
      canForRole("accountant")
    );
    const labels = accountant.map(c => c.id);
    expect(labels).toContain("journal.manual");
    expect(labels).toContain("finance.statements");
    expect(labels).toContain("finance.cost-centers");
    expect(labels).not.toContain("commerce.sale");
    expect(labels).not.toContain("gov.permissions");
  });

  it("مدير المؤسسة يرى نوايا البيع والإدارة", () => {
    const admin = filterCommandsForRole(WORK_COMMANDS, canForRole("admin"));
    const labels = admin.map(c => c.id);
    expect(labels).toContain("commerce.sale");
    expect(labels).toContain("gov.permissions");
    expect(labels).toContain("journal.manual");
  });

  it("لا يخفي الأوامر بلا صلاحية مطلوبة (متاحة للجميع)", () => {
    const userCommands = filterCommandsForRole(
      WORK_COMMANDS,
      canForRole("user")
    );
    expect(userCommands.some(c => c.id === "ops.maintenance")).toBe(true);
    expect(userCommands.some(c => c.id === "ops.requisitions")).toBe(true);
  });

  it("مالك المنصة يملك كل أوامر السجل", () => {
    const owner = filterCommandsForRole(WORK_COMMANDS, canForRole("owner"));
    expect(owner.length).toBe(WORK_COMMANDS.length);
  });

  it("يرتّب حسب النية ثم الأولوية", () => {
    const sorted = sortCommands(WORK_COMMANDS);
    const positions = sorted.map(c => COMMAND_INTENT_ORDER.indexOf(c.intent));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1]);
    }
    // أول أمر مالي هو الأهم في النية
    expect(sorted[0].intent).toBe("finance");
  });

  it("لا يعدّل المصفوفة الأصلية عند الترتيب", () => {
    const before = WORK_COMMANDS.map(c => c.id);
    sortCommands(WORK_COMMANDS);
    expect(WORK_COMMANDS.map(c => c.id)).toEqual(before);
  });

  it("يجمّع الأوامر حسب النية بلا مجموعات فارغة", () => {
    const groups = groupCommandsByIntent(WORK_COMMANDS);
    expect(groups.length).toBeGreaterThan(0);
    const total = groups.reduce((sum, g) => sum + g.commands.length, 0);
    expect(total).toBe(WORK_COMMANDS.length);
    for (const group of groups) {
      expect(group.commands.length).toBeGreaterThan(0);
      expect(group.commands.every(c => c.intent === group.intent)).toBe(true);
    }
    const intents = groups.map(g => g.intent);
    expect(intents).toEqual(
      COMMAND_INTENT_ORDER.filter(i => intents.includes(i))
    );
  });

  it("كل أمر يحمل تسمية نية عربية وكلمات بحث", () => {
    for (const command of WORK_COMMANDS) {
      expect(
        COMMAND_INTENT_LABELS[command.intent as CommandIntent]
      ).toBeTruthy();
      expect(Array.isArray(command.keywords)).toBe(true);
    }
  });
});
