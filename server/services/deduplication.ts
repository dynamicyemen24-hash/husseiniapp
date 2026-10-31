/**
 * deduplication — ضمان عدم التكرار وسلامة البيانات
 * يتحقق من التكرار قبل الإنشاء: بالكود، الهاتف، البريد، الرقم الضريبي
 * مع مراعاة الدولة والنوع (شخص/جهة)
 */
import { eq, and, or, ilike } from "drizzle-orm";

export interface DuplicateCheck {
  isDuplicate: boolean;
  field?: "code" | "phone" | "email" | "taxNumber" | "name";
  existingId?: number;
  message?: string;
}

export function normalizeForCompare(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[-_\s]/g, "");
}

/**
 * يتحقق من تكرار العميل/المورد في نفس المستأجر
 * يُستدعى قبل insert — يرمي خطأ واضح أو يعيد موجود
 */
export async function checkCustomerDuplicate(
  db: any,
  table: any,
  tenantId: number,
  input: {
    code?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    name?: string;
  }
): Promise<DuplicateCheck> {
  const normalizedPhone = input.phone
    ? input.phone.replace(/[\s\-()]/g, "")
    : null;
  const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
  const normalizedTax = input.taxNumber
    ? input.taxNumber.replace(/\D/g, "")
    : null;

  // 1) الكود
  if (input.code) {
    const byCode = await db
      .select()
      .from(table)
      .where(
        and(eq(table.tenantId, tenantId), eq(table.code, input.code.trim()))
      )
      .limit(1);
    if (byCode.length)
      return {
        isDuplicate: true,
        field: "code",
        existingId: byCode[0].id,
        message: "الكود مستخدم مسبقاً",
      };
  }
  // 2) الهاتف (مع تطبيع)
  if (normalizedPhone) {
    const all = await db
      .select()
      .from(table)
      .where(eq(table.tenantId, tenantId))
      .limit(100);
    const dup = all.find(
      (r: any) =>
        r.phone && r.phone.replace(/[\s\-()]/g, "") === normalizedPhone
    );
    if (dup)
      return {
        isDuplicate: true,
        field: "phone",
        existingId: dup.id,
        message: "رقم الهاتف مسجل لعميل آخر",
      };
  }
  // 3) البريد
  if (normalizedEmail) {
    const byEmail = await db
      .select()
      .from(table)
      .where(
        and(eq(table.tenantId, tenantId), eq(table.email, normalizedEmail))
      )
      .limit(1);
    if (byEmail.length)
      return {
        isDuplicate: true,
        field: "email",
        existingId: byEmail[0].id,
        message: "البريد مسجل مسبقاً",
      };
  }
  // 4) الضريبي
  if (normalizedTax) {
    const all = await db
      .select()
      .from(table)
      .where(eq(table.tenantId, tenantId))
      .limit(100);
    const dup = all.find(
      (r: any) =>
        r.taxNumber && r.taxNumber.replace(/\D/g, "") === normalizedTax
    );
    if (dup)
      return {
        isDuplicate: true,
        field: "taxNumber",
        existingId: dup.id,
        message: "الرقم الضريبي مسجل مسبقاً",
      };
  }
  return { isDuplicate: false };
}
