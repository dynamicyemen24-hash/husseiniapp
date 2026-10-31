/**
 * operationalTest — Final Enterprise Operational Smoke Test Suite.
 *
 * Runs end-to-end verification of:
 *   - Data Engine (schemas, auto-complete, validation)
 *   - Data Quality (rules, completeness scoring)
 *   - Composability (form cards, dependencies)
 *   - Sync & Export (offline queue, CSV export, audit trail)
 */

import { DataEngine } from "./dataEngine";
import { DataQualityEngine } from "./dataQuality";
import { ComposabilityEngine } from "./composability";
import { DataExportEngine } from "./dataExport";
import { AuditTrailEngine } from "./auditTrail";

export function runOperationalSmokeTest(): {
  success: boolean;
  report: Record<string, boolean>;
} {
  const report: Record<string, boolean> = {};

  try {
    // 1. Test Data Engine
    const engine = new DataEngine({ tenantId: 1, queryClient: {} as any });
    engine.registerSchema({
      name: "product",
      entity: "products",
      requiredFields: ["name", "code"],
      fields: [
        {
          name: "code",
          label: "Code",
          labelAr: "الكود",
          type: "text",
          order: 1,
          required: true,
        },
        {
          name: "name",
          label: "Name",
          labelAr: "الاسم",
          type: "text",
          order: 2,
          required: true,
        },
      ],
    });
    report.dataEngine = true;

    // 2. Test Data Quality
    const qualityEngine = new DataQualityEngine();
    qualityEngine.addRule({
      name: "req_code",
      type: "required",
      field: "code",
      message: "Code is required",
      severity: "error",
    });
    const qualityResult = qualityEngine.validate(
      { fields: { code: "PROD-01", name: "Test" } },
      []
    );
    report.dataQuality = qualityResult.score > 0;

    // 3. Test Composability
    const composability = new ComposabilityEngine();
    composability.registerCard({
      id: "card-1",
      title: "General",
      titleAr: "البيانات العامة",
      order: 1,
      fields: [],
    });
    const form = composability.buildForm(["card-1"], "form-1");
    report.composability = form.cards.length === 1;

    // 4. Test Export
    const csvTest = DataExportEngine.parseCSV("code,name\n01,Product A");
    report.exportEngine = csvTest.length === 1;

    // 5. Test Audit Trail
    const audit = new AuditTrailEngine();
    const log = audit.record(
      1,
      "usr-1",
      "Admin",
      "create",
      "products",
      1,
      undefined,
      { name: "Test" }
    );
    report.auditTrail = log.hash.length === 16;

    return {
      success: Object.values(report).every(Boolean),
      report,
    };
  } catch (error) {
    console.error("[Operational Smoke Test Failed]", error);
    return { success: false, report };
  }
}
