import { describe, expect, it } from "vitest";
import { friendlyError } from "./friendlyErrors";

describe("friendlyError — لغة التاجر", () => {
  it("يمرر رسائل الخادم العربية كما هي", () => {
    expect(friendlyError(new Error("الكمية غير متوفرة"))).toBe(
      "الكمية غير متوفرة"
    );
    expect(
      friendlyError("تعذر التحقق من حالة الفترة المالية — تم إيقاف الترحيل")
    ).toBe("تعذر التحقق من حالة الفترة المالية — تم إيقاف الترحيل");
  });

  it("يترجم رموز tRPC/HTTP التقنية", () => {
    expect(friendlyError({ code: "FORBIDDEN", message: "Access denied" })).toBe(
      "ليس لديك صلاحية لهذا الإجراء — تواصل مع مدير المنشأة"
    );
    expect(friendlyError("TOO_MANY_REQUESTS")).toContain("انتظر لحظات");
    expect(friendlyError("Failed to fetch")).toContain("الاتصال");
    expect(friendlyError("DATABASE_UNAVAILABLE: down")).toContain("مشغولة");
    expect(friendlyError("CROSS_TENANT_DENIED")).toContain("منشأة أخرى");
    expect(friendlyError("insufficient_stock")).toContain("المخزون");
  });

  it("يستخدم fallback عند الفراغ أو الغموض", () => {
    expect(friendlyError(null)).toBe("تعذر إتمام العملية — حاول مرة أخرى");
    expect(friendlyError(undefined, "مخصص")).toBe("مخصص");
    expect(friendlyError("xyzq!@#unmapped", "مخصص")).toBe("مخصص");
  });
});
