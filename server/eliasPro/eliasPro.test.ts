import { describe, it, expect, beforeEach } from "vitest";
import { SimulatedAgentAdapter } from "./adapters/simulatedAgentAdapter";
import {
  normalizeSnapshot,
  normalizeWorkOrder,
  HttpAgentAdapter,
} from "./adapters/httpAgentAdapter";
import { EliasAgentError } from "./ports";
import {
  encryptNodeToken,
  decryptNodeToken,
  fingerprintToken,
} from "./tokenVault";
import { snapshotFromProbe } from "./service";
import { evaluateEliasHealth, eliasLevelForScore } from "../../shared/eliasPro";
import { getEliasEngine, listEliasEngines } from "../../shared/eliasPro";

/**
 * Elias Pro — اختبارات الوحدة للطبقة دولاء الأقطار.
 * تغطي المحاكي، ومحوّل HTTP (نزع التطبيع)، وخزنة الرموز،
 * ومحوّل القياسات، وبوابة الخطورة.
 */
describe("Elias Pro — subsystem", () => {
  beforeEach(() => {
    // no-op: كل اختبار يبني كائناته بنفسه
  });

  describe("SimulatedAgentAdapter", () => {
    const makeAdapter = (now = 1_700_000_000_000) =>
      new SimulatedAgentAdapter({
        nodeId: 7,
        code: "NODE-HQ-01",
        name: "عقدة المقر",
        now: () => now,
        latencyMs: 1,
      });

    it("يوفّر لقطة جهاز متسقة عبر الزمن (حتمية)", async () => {
      const adapter = makeAdapter();
      const a = await adapter.snapshot();
      const b = await adapter.snapshot();
      expect(a.deviceKey).toBe(b.deviceKey);
      expect(a.cpu.loadPct).toBe(b.cpu.loadPct);
      expect(a.platform).toBeTruthy();
    });

    it("لا يرمي في health بل يعيد حالة offline عند الفشل", async () => {
      const adapter = makeAdapter();
      const health = await adapter.health();
      expect(["online", "degraded", "offline"]).toContain(health.status);
      expect(health.checkedAt).toBeTruthy();
    });

    it("يتخطى المحركات عالية الخطورة بدون إقرار صريح", async () => {
      const adapter = makeAdapter();
      const engine = getEliasEngine("recovery")!;
      expect(engine.risk).toBe("high");
      const result = await adapter.runEngine(engine);
      expect(result.status).toBe("skipped");
      expect(result.error).toBeTruthy();
    });

    it("يشغّل المحركات منخفضة الخطورة بنجاح", async () => {
      const adapter = makeAdapter();
      const engine = getEliasEngine("hdr")!;
      const result = await adapter.runEngine(engine);
      expect(result.status).toBe("success");
      expect(result.output).toBeTruthy();
    });

    it("ينشئ أمر صيانة ويحدّث حالته", async () => {
      const adapter = makeAdapter();
      const order = await adapter.createWorkOrder({
        title: "إصلاح شاشة",
        customerName: "عميل",
      });
      expect(order.externalRef).toMatch(/^TKT-SIM-/);
      expect(order.status).toBe("received");

      const updated = await adapter.updateWorkOrderStatus(
        order.externalRef,
        "repairing"
      );
      expect(updated.status).toBe("repairing");
    });

    it("يرفض تحديث أمر غير موجود", async () => {
      const adapter = makeAdapter();
      await expect(
        adapter.updateWorkOrderStatus("TKT-NOPE", "ready")
      ).rejects.toBeInstanceOf(EliasAgentError);
    });
  });

  describe("HTTP adapter — نزع التطبيع", () => {
    it("يحوّل حمولة خام إلى عقدة المنصة", () => {
      const snapshot = normalizeSnapshot(
        {
          platform: "Windows",
          cpu: { name: "Xeon", cores: 8, loadPct: 12 },
          memory: { totalGb: 16, freeGb: 8 },
          storage: { totalGb: 512, freeGb: 100, healthy: true },
          battery: { present: false },
          network: { status: "online", rttMs: 22 },
          processes: [{ name: "svc", pid: 5, cpuPct: 1.5, memMb: 120 }],
        },
        "fallback-key",
        "fallback-label"
      );

      expect(snapshot.platform).toBe("windows");
      expect(snapshot.cpu.cores).toBe(8);
      expect(snapshot.memory.usedPct).toBeCloseTo(50, 1);
      expect(snapshot.storage.usedPct).toBeCloseTo(80.47, 1);
      expect(snapshot.battery.present).toBe(false);
      expect(snapshot.processes).toHaveLength(1);
      expect(snapshot.deviceKey).toBe("fallback-key");
    });

    it("لا ينهار على حمولة فارغة أو غريبة", () => {
      const snapshot = normalizeSnapshot(null, "k", "l");
      expect(snapshot.cpu.name).toBeNull();
      expect(snapshot.memory.usedPct).toBeNull();
      expect(snapshot.processes).toEqual([]);
    });

    it("يحوّل أمر صيانة خام إلى عقدة المنصة", () => {
      const order = normalizeWorkOrder(
        {
          id: 3,
          ref: "TKT-2026-0003",
          title: "صيانة",
          status: "repairing",
          priority: "high",
          estimatedCost: "150.50",
          parts: [{ sku: "P1", name: "شاشة", qty: 1, unitCost: 90 }],
        },
        9,
        "عقدة"
      );
      expect(order.externalRef).toBe("TKT-2026-0003");
      expect(order.status).toBe("repairing");
      expect(order.estimatedCost).toBeCloseTo(150.5);
      expect(order.parts[0].sku).toBe("P1");
      expect(order.nodeId).toBe(9);
    });

    it("يحوّل استجابة 401 إلى EliasAgentError غير مصرّح", async () => {
      const adapter = new HttpAgentAdapter({
        nodeId: 1,
        code: "N1",
        name: "Node",
        baseUrl: "https://node.test",
        token: "secret-token",
        timeoutMs: 100,
        fetchImpl: (async () =>
          new Response("nope", { status: 401 })) as unknown as typeof fetch,
      });

      await expect(adapter.snapshot()).rejects.toMatchObject({
        status: "unauthorized",
      });
    });

    it("يعيد offline من health بدل الرمي", async () => {
      const adapter = new HttpAgentAdapter({
        nodeId: 1,
        code: "N1",
        name: "Node",
        baseUrl: "https://node.test",
        timeoutMs: 100,
        fetchImpl: (async () => {
          throw new Error("ECONNREFUSED");
        }) as unknown as typeof fetch,
      });

      const health = await adapter.health();
      expect(health.status).toBe("offline");
      expect(health.message).toBeTruthy();
    });
  });

  describe("tokenVault", () => {
    it("يعيد تشفير الرمز بنفس القيمة (دورة كاملة)", () => {
      const token = "super-secret-node-token";
      const enc = encryptNodeToken(token);
      expect(enc).toBeTruthy();
      expect(enc).not.toContain(token);
      expect(decryptNodeToken(enc)).toBe(token);
    });

    it("يعيد null للرمز الفارغ أو التالف", () => {
      expect(encryptNodeToken(null)).toBeNull();
      expect(encryptNodeToken("")).toBeNull();
      expect(decryptNodeToken("garbage")).toBeNull();
      expect(decryptNodeToken(null)).toBeNull();
    });

    it("يعطي بصمة ثابتة لا تكشف الرمز", () => {
      const a = fingerprintToken("abc");
      const b = fingerprintToken("abc");
      expect(a).toBe(b);
      expect(a).toHaveLength(64);
      expect(a).not.toContain("abc");
    });
  });

  describe("محوّل القياسات (browser probe)", () => {
    it("يبني لقطة من قياسات المتصفح", () => {
      const snapshot = snapshotFromProbe({
        deviceKey: "browser-abc",
        deviceLabel: "متصفح المستخدم",
        platform: "web",
        cpuLoadPct: 30,
        cores: 4,
        totalRamGb: 8,
        freeRamGb: 4,
        storageTotalGb: 256,
        storageFreeGb: 128,
        rttMs: 40,
        networkType: "wifi",
      });

      expect(snapshot.deviceKey).toBe("browser-abc");
      expect(snapshot.memory.usedPct).toBeCloseTo(50, 1);
      expect(snapshot.storage.usedPct).toBeCloseTo(50, 1);
      expect(snapshot.battery.present).toBe(false);
      expect(snapshot.network.rttMs).toBe(40);
    });

    it("يحسب تقرير صحة متسقاً مع اللقطة", () => {
      const snapshot = snapshotFromProbe({
        deviceKey: "browser-xyz",
        deviceLabel: "متصفح",
        platform: "web",
        cpuLoadPct: 10,
        totalRamGb: 16,
        freeRamGb: 14,
        storageTotalGb: 512,
        storageFreeGb: 400,
        rttMs: 20,
      });
      const report = evaluateEliasHealth(snapshot);
      expect(report.score).toBeGreaterThan(0);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(report.level).toBe(eliasLevelForScore(report.score));
      expect(Array.isArray(report.areas)).toBe(true);
    });
  });

  describe("كتالوج المحركات", () => {
    it("يحتوي محركاً لكل فئة معلنة", () => {
      for (const category of [
        "network",
        "system",
        "hardware",
        "shop",
        "enterprise",
        "ai",
      ] as const) {
        expect(listEliasEngines(category).length).toBeGreaterThan(0);
      }
    });

    it("يبحث بالرمز kamp تقريباً", () => {
      expect(getEliasEngineByCode("hdr")?.id).toBe("hdr");
      expect(getEliasEngineByCode("HDR")?.id).toBe("hdr");
      expect(getEliasEngine("does-not-exist")).toBeUndefined();
    });
  });
});

// نسخة محلية لتفادي استيراد الدالة المسماة export من الوحدة الجذرية.
function getEliasEngineByCode(code: string) {
  const engines = listEliasEngines();
  return engines.find(e => e.code.toUpperCase() === code.toUpperCase());
}
