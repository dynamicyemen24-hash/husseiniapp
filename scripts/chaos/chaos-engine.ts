#!/usr/bin/env tsx
/**
 * ALHUSAINIA Chaos Engineering Engine
 * ====================================
 * Automated chaos experiments for resilience validation.
 * Integrates with LitmusChaos concepts, runs natively without Kubernetes.
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

interface ChaosExperiment {
  name: string;
  description: string;
  target: "database" | "cache" | "api" | "network";
  duration: number; // seconds
  severity: "low" | "medium" | "high";
  steadyStateCheck: () => Promise<boolean>;
  injectFault: () => Promise<void>;
  rollback: () => Promise<void>;
  successCriteria: () => Promise<boolean>;
}

interface ChaosResult {
  experiment: string;
  status: "passed" | "failed" | "error";
  duration: number;
  steadyStateBefore: boolean;
  steadyStateAfter: boolean;
  successCriteriaMet: boolean;
  error?: string;
  metrics: Record<string, number>;
}

const RESULTS_DIR = resolve(process.cwd(), "chaos-results");
if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });

// ============================================================================
// STEADY STATE CHECKS
// ============================================================================

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:3000/api/health", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    return data.dbAvailable === true;
  } catch {
    return false;
  }
}

async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:3000/api/live", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

async function checkCacheHealth(): Promise<boolean> {
  try {
    // Try to connect to Redis if configured
    if (!process.env.REDIS_URL) return true; // Skip if no Redis
    const response = await fetch("http://localhost:3000/api/cache/health", {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return true; // Cache optional
  }
}

async function checkOverallSteadyState(): Promise<boolean> {
  const [db, api, cache] = await Promise.all([
    checkDatabaseHealth(),
    checkApiHealth(),
    checkCacheHealth(),
  ]);
  return db && api && cache;
}

// ============================================================================
// FAULT INJECTION IMPLEMENTATIONS
// ============================================================================

async function injectDatabaseLatency(latencyMs: number, duration: number): Promise<() => Promise<void>> {
  // Use tc (traffic control) or proxy to inject latency
  // For serverless/Neon, we simulate by adding delay in application layer
  console.log(`[Chaos] Injecting ${latencyMs}ms DB latency for ${duration}s`);
  
  // In production: use tc qdisc on DB proxy or sidecar
  // For now: set env var that our DB layer respects
  process.env.CHAOS_DB_LATENCY_MS = String(latencyMs);
  
  const rollback = async () => {
    delete process.env.CHAOS_DB_LATENCY_MS;
    console.log("[Chaos] Rolled back DB latency injection");
  };
  
  // Auto-rollback after duration
  setTimeout(rollback, duration * 1000);
  return rollback;
}

async function injectDatabaseErrors(errorRate: number, duration: number): Promise<() => Promise<void>> {
  console.log(`[Chaos] Injecting ${errorRate * 100}% DB errors for ${duration}s`);
  process.env.CHAOS_DB_ERROR_RATE = String(errorRate);
  
  const rollback = async () => {
    delete process.env.CHAOS_DB_ERROR_RATE;
    console.log("[Chaos] Rolled back DB error injection");
  };
  
  setTimeout(rollback, duration * 1000);
  return rollback;
}

async function injectCacheUnavailable(duration: number): Promise<() => Promise<void>> {
  console.log(`[Chaos] Making cache unavailable for ${duration}s`);
  process.env.CHAOS_CACHE_UNAVAILABLE = "true";
  
  const rollback = async () => {
    delete process.env.CHAOS_CACHE_UNAVAILABLE;
    console.log("[Chaos] Rolled back cache unavailability");
  };
  
  setTimeout(rollback, duration * 1000);
  return rollback;
}

async function injectNetworkPartition(target: string, duration: number): Promise<() => Promise<void>> {
  console.log(`[Chaos] Network partition to ${target} for ${duration}s`);
  // In production: use iptables or tc
  // For now: set env var
  process.env[`CHAOS_NETWORK_PARTITION_${target.toUpperCase()}`] = "true";
  
  const rollback = async () => {
    delete process.env[`CHAOS_NETWORK_PARTITION_${target.toUpperCase()}`];
    console.log(`[Chaos] Rolled back network partition to ${target}`);
  };
  
  setTimeout(rollback, duration * 1000);
  return rollback;
}

async function injectApiLatency(latencyMs: number, duration: number): Promise<() => Promise<void>> {
  console.log(`[Chaos] Injecting ${latencyMs}ms API latency for ${duration}s`);
  process.env.CHAOS_API_LATENCY_MS = String(latencyMs);
  
  const rollback = async () => {
    delete process.env.CHAOS_API_LATENCY_MS;
    console.log("[Chaos] Rolled back API latency injection");
  };
  
  setTimeout(rollback, duration * 1000);
  return rollback;
}

// ============================================================================
// EXPERIMENT DEFINITIONS
// ============================================================================

const EXPERIMENTS: ChaosExperiment[] = [
  {
    name: "database-latency-low",
    description: "Inject 500ms database latency for 30s",
    target: "database",
    duration: 30,
    severity: "low",
    steadyStateCheck: checkOverallSteadyState,
    injectFault: () => injectDatabaseLatency(500, 30),
    rollback: async () => { delete process.env.CHAOS_DB_LATENCY_MS; },
    successCriteria: async () => {
      // System should remain available, latency < 2s
      const start = Date.now();
      await fetch("http://localhost:3000/api/health");
      return Date.now() - start < 2000;
    },
  },
  {
    name: "database-latency-high",
    description: "Inject 2s database latency for 60s",
    target: "database",
    duration: 60,
    severity: "high",
    steadyStateCheck: checkOverallSteadyState,
    injectFault: () => injectDatabaseLatency(2000, 60),
    rollback: async () => { delete process.env.CHAOS_DB_LATENCY_MS; },
    successCriteria: async () => {
      // Should still serve requests, maybe degraded
      try {
        await fetch("http://localhost:3000/api/live", { signal: AbortSignal.timeout(5000) });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: "database-errors-5%",
    description: "Inject 5% database errors for 60s",
    target: "database",
    duration: 60,
    severity: "medium",
    steadyStateCheck: checkOverallSteadyState,
    injectFault: () => injectDatabaseErrors(0.05, 60),
    rollback: async () => { delete process.env.CHAOS_DB_ERROR_RATE; },
    successCriteria: async () => {
      // Error rate should be < 10% (our circuit breaker threshold)
      let errors = 0, total = 0;
      for (let i = 0; i < 20; i++) {
        try {
          await fetch("http://localhost:3000/api/health", { signal: AbortSignal.timeout(2000) });
          total++;
        } catch {
          errors++; total++;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      return errors / total < 0.1;
    },
  },
  {
    name: "cache-unavailable",
    description: "Make cache completely unavailable for 60s",
    target: "cache",
    duration: 60,
    severity: "medium",
    steadyStateCheck: checkOverallSteadyState,
    injectFault: () => injectCacheUnavailable(60),
    rollback: async () => { delete process.env.CHAOS_CACHE_UNAVAILABLE; },
    successCriteria: async () => {
      // App should work without cache (graceful degradation)
      try {
        const res = await fetch("http://localhost:3000/api/health");
        return res.ok;
      } catch {
        return false;
      }
    },
  },
  {
    name: "api-latency-spike",
    description: "Inject 1s API latency spike for 30s",
    target: "api",
    duration: 30,
    severity: "medium",
    steadyStateCheck: checkOverallSteadyState,
    injectFault: () => injectApiLatency(1000, 30),
    rollback: async () => { delete process.env.CHAOS_API_LATENCY_MS; },
    successCriteria: async () => {
      // P95 should stay under 3s during spike
      const latencies: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await fetch("http://localhost:3000/api/live", { signal: AbortSignal.timeout(5000) });
        latencies.push(Date.now() - start);
        await new Promise(r => setTimeout(r, 100));
      }
      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      return p95 < 3000;
    },
  },
  {
    name: "database-unavailable",
    description: "Simulate complete database outage for 30s",
    target: "database",
    duration: 30,
    severity: "high",
    steadyStateCheck: checkOverallSteadyState,
    injectFault: () => injectDatabaseErrors(1.0, 30),
    rollback: async () => { delete process.env.CHAOS_DB_ERROR_RATE; },
    successCriteria: async () => {
      // Should return 503 with proper error message
      try {
        const res = await fetch("http://localhost:3000/api/health");
        return res.status === 503;
      } catch {
        return false;
      }
    },
  },
];

// ============================================================================
// EXPERIMENT RUNNER
// ============================================================================

async function runExperiment(experiment: ChaosExperiment): Promise<ChaosResult> {
  console.log(`\n🧪 Starting: ${experiment.name}`);
  console.log(`   ${experiment.description}`);
  console.log(`   Target: ${experiment.target} | Severity: ${experiment.severity} | Duration: ${experiment.duration}s`);

  const startTime = Date.now();
  
  // 1. Verify steady state before
  const steadyStateBefore = await experiment.steadyStateCheck();
  console.log(`   Steady state before: ${steadyStateBefore ? "✅ HEALTHY" : "❌ UNHEALTHY"}`);
  
  if (!steadyStateBefore) {
    return {
      experiment: experiment.name,
      status: "error",
      duration: 0,
      steadyStateBefore: false,
      steadyStateAfter: false,
      successCriteriaMet: false,
      error: "Pre-condition failed: system not in steady state",
      metrics: {},
    };
  }

  // 2. Inject fault
  let rollback!: () => Promise<void>;
  try {
    rollback = await experiment.injectFault();
    console.log(`   Fault injected, running for ${experiment.duration}s...`);
  } catch (error) {
    return {
      experiment: experiment.name,
      status: "error",
      duration: Date.now() - startTime,
      steadyStateBefore: true,
      steadyStateAfter: false,
      successCriteriaMet: false,
      error: `Fault injection failed: ${error}`,
      metrics: {},
    };
  }

  // 3. Wait for experiment duration
  await new Promise(r => setTimeout(r, experiment.duration * 1000));

  // 4. Check success criteria during/after fault
  let successCriteriaMet = false;
  try {
    successCriteriaMet = await experiment.successCriteria();
    console.log(`   Success criteria: ${successCriteriaMet ? "✅ MET" : "❌ NOT MET"}`);
  } catch (error) {
    console.log(`   Success criteria error: ${error}`);
  }

  // 5. Rollback
  try {
    await rollback();
    console.log("   Fault rolled back");
  } catch (error) {
    console.error(`   Rollback failed: ${error}`);
  }

  // 6. Wait for recovery
  await new Promise(r => setTimeout(r, 5000));

  // 7. Verify steady state after
  const steadyStateAfter = await experiment.steadyStateCheck();
  console.log(`   Steady state after: ${steadyStateAfter ? "✅ RECOVERED" : "❌ STILL UNHEALTHY"}`);

  const duration = Date.now() - startTime;
  const status = steadyStateBefore && steadyStateAfter && successCriteriaMet ? "passed" : "failed";

  return {
    experiment: experiment.name,
    status,
    duration,
    steadyStateBefore,
    steadyStateAfter,
    successCriteriaMet,
    metrics: {
      experimentDuration: experiment.duration,
      totalDuration: duration,
    },
  };
}

async function runAllExperiments(): Promise<ChaosResult[]> {
  console.log("🚀 ALHUSAINIA Chaos Engineering Suite");
  console.log("=====================================\n");

  const results: ChaosResult[] = [];

  for (const experiment of EXPERIMENTS) {
    const result = await runExperiment(experiment);
    results.push(result);
    
    // Brief pause between experiments
    await new Promise(r => setTimeout(r, 3000));
  }

  return results;
}

// ============================================================================
// REPORTING
// ============================================================================

function generateReport(results: ChaosResult[]): string {
  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status === "failed").length;
  const errors = results.filter(r => r.status === "error").length;
  const total = results.length;

  let report = `
# Chaos Engineering Report
Generated: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || "development"}

## Summary
- **Total Experiments**: ${total}
- **Passed**: ${passed} ✅
- **Failed**: ${failed} ❌
- **Errors**: ${errors} ⚠️
- **Success Rate**: ${((passed / total) * 100).toFixed(1)}%

## Details
`;

  for (const result of results) {
    const icon = result.status === "passed" ? "✅" : result.status === "failed" ? "❌" : "⚠️";
    report += `
### ${icon} ${result.experiment}
- **Status**: ${result.status.toUpperCase()}
- **Duration**: ${result.duration}ms
- **Steady State Before**: ${result.steadyStateBefore ? "✅" : "❌"}
- **Steady State After**: ${result.steadyStateAfter ? "✅" : "❌"}
- **Success Criteria**: ${result.successCriteriaMet ? "✅ MET" : "❌ NOT MET"}
${result.error ? `- **Error**: ${result.error}` : ""}
`;
  }

  report += `
## Recommendations
`;

  const failedExperiments = results.filter(r => r.status === "failed");
  if (failedExperiments.length > 0) {
    report += "### Immediate Action Required\n";
    for (const exp of failedExperiments) {
      report += `- **${exp.experiment}**: Investigate failure - `;
      if (!exp.steadyStateAfter) report += "System did not recover automatically";
      else if (!exp.successCriteriaMet) report += "Success criteria not met during fault";
      else report += "Unknown failure mode";
      report += "\n";
    }
  } else {
    report += "All experiments passed. System demonstrates good resilience.\n";
  }

  return report;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const specificExperiment = args[0];

  let experimentsToRun = EXPERIMENTS;
  if (specificExperiment) {
    const exp = EXPERIMENTS.find(e => e.name === specificExperiment);
    if (!exp) {
      console.error(`Experiment not found: ${specificExperiment}`);
      console.log("Available experiments:", EXPERIMENTS.map(e => e.name).join(", "));
      process.exit(1);
    }
    experimentsToRun = [exp];
  }

  // Override experiment list if specific one requested
  const originalExperiments = EXPERIMENTS;
  if (specificExperiment) {
    (EXPERIMENTS as any).length = 0;
    EXPERIMENTS.push(...experimentsToRun);
  }

  try {
    const results = await runAllExperiments();
    
    // Generate report
    const report = generateReport(results);
    const reportPath = resolve(RESULTS_DIR, `chaos-report-${Date.now()}.md`);
    writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Also save JSON for CI integration
    const jsonPath = resolve(RESULTS_DIR, `chaos-results-${Date.now()}.json`);
    writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    
    // Print summary
    const passed = results.filter(r => r.status === "passed").length;
    const total = results.length;
    console.log(`\n${passed}/${total} experiments passed`);
    
    // Exit code for CI
    const failed = results.filter(r => r.status === "failed" || r.status === "error").length;
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error("Chaos engine failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);