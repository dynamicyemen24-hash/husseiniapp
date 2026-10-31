#!/usr/bin/env node
/**
 * 🏆 Quality Agent Orchestrator
 * Runs all 10 expert agents and generates comprehensive report
 *
 * @description
 * This orchestrator coordinates all quality agents:
 * - Sequential execution of all agents
 * - Comprehensive quality report generation
 * - Integration with CI/CD pipeline
 * - Real-time monitoring and validation
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

class QualityOrchestrator {
  constructor() {
    this.projectRoot = process.cwd();
    this.agentsDir = join(this.projectRoot, "scripts", "agents");
    this.resultsDir = join(this.projectRoot, "test-results");
    this.agents = [
      {
        name: "Performance Optimization",
        file: "01-performance-agent.mjs",
        score: 0,
      },
      { name: "Security Validation", file: "02-security-agent.mjs", score: 0 },
      { name: "Code Quality", file: "03-code-quality-agent.mjs", score: 0 },
      { name: "Testing Automation", file: "04-testing-agent.mjs", score: 0 },
      { name: "Documentation", file: "05-documentation-agent.mjs", score: 0 },
      { name: "Deployment", file: "06-deployment-agent.mjs", score: 0 },
      { name: "Monitoring", file: "07-monitoring-agent.mjs", score: 0 },
      { name: "Accessibility", file: "08-accessibility-agent.mjs", score: 0 },
      { name: "SEO Optimization", file: "09-seo-agent.mjs", score: 0 },
      { name: "Brand Consistency", file: "10-brand-agent.mjs", score: 0 },
    ];
  }

  async runAll() {
    console.log("\n" + "=".repeat(70));
    console.log("🏆 GLOBAL PRODUCTION QUALITY AGENTS - COMPREHENSIVE SUITE");
    console.log("=".repeat(70) + "\n");

    console.log("📊 Running all 10 expert agents...\n");

    const results = [];

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      const agentFile = join(this.agentsDir, agent.file);

      console.log(`[${i + 1}/10] ${agent.name} Agent...`);

      try {
        if (existsSync(agentFile)) {
          const output = execSync(`node "${agentFile}"`, {
            cwd: this.projectRoot,
            timeout: 30000,
            encoding: "utf8",
          });
          console.log(`  ✓ ${agent.name} completed successfully\n`);
          results.push({ agent: agent.name, status: "success", output });
        } else {
          console.log(`  ⚠️  Agent file not found: ${agent.file}\n`);
          results.push({ agent: agent.name, status: "not_found", output: "" });
        }
      } catch (error) {
        console.log(`  ❌ ${agent.name} failed: ${error.message}\n`);
        results.push({
          agent: agent.name,
          status: "failed",
          output: error.message,
        });
      }
    }

    // Generate comprehensive report
    this.generateComprehensiveReport(results);

    // Calculate overall quality score
    const overallScore = this.calculateOverallScore();

    console.log("\n" + "=".repeat(70));
    console.log("🎯 OVERALL QUALITY SCORE: " + overallScore + "/100");
    console.log("=".repeat(70) + "\n");

    return overallScore;
  }

  calculateOverallScore() {
    // Read all agent reports and calculate average
    const reportFiles = [
      "performance-report.json",
      "security-report.json",
      "code-quality-report.json",
      "testing-report.json",
      "documentation-report.json",
      "deployment-report.json",
      "monitoring-report.json",
      "accessibility-report.json",
      "seo-report.json",
      "brand-report.json",
    ];

    let totalScore = 0;
    let count = 0;

    reportFiles.forEach(file => {
      const filePath = join(this.resultsDir, file);
      if (existsSync(filePath)) {
        try {
          const report = JSON.parse(readFileSync(filePath, "utf-8"));
          if (report.score !== undefined) {
            totalScore += report.score;
            count++;
          }
        } catch {}
      }
    });

    return count > 0 ? Math.round(totalScore / count) : 0;
  }

  generateComprehensiveReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      overallScore: this.calculateOverallScore(),
      agents: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "failed").length,
        notFound: results.filter(r => r.status === "not_found").length,
      },
    };

    const reportPath = join(
      this.resultsDir,
      "comprehensive-quality-report.json"
    );
    try {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
    } catch {}

    // Generate HTML report
    this.generateHTMLReport(report);
  }

  generateHTMLReport(report) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quality Agent Report - Husseiniya Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .score { font-size: 4rem; font-weight: bold; text-align: center; margin: 2rem 0; color: #10b981; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .card { background: #1e293b; padding: 1.5rem; border-radius: 12px; border: 1px solid #334155; }
        .card h3 { margin-bottom: 1rem; color: #60a5fa; }
        .status { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; }
        .status.success { background: #064e3b; color: #34d399; }
        .status.failed { background: #7f1d1d; color: #f87171; }
        .footer { text-align: center; margin-top: 3rem; color: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏆 Global Production Quality Report</h1>
        <p>Generated: ${report.timestamp}</p>
        
        <div class="score">${report.overallScore}/100</div>
        
        <div class="grid">
            ${report.agents
              .map(
                agent => `
                <div class="card">
                    <h3>${agent.agent}</h3>
                    <span class="status ${agent.status}">${agent.status}</span>
                </div>
            `
              )
              .join("")}
        </div>
        
        <div class="footer">
            <p>Husseiniya Platform - Global Production Quality Suite</p>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = join(this.resultsDir, "quality-report.html");
    try {
      writeFileSync(htmlPath, html);
    } catch {}
  }
}

// Main execution
const orchestrator = new QualityOrchestrator();

if (import.meta.url === `file://${process.argv[1]}`) {
  orchestrator
    .runAll()
    .then(score => {
      console.log(`\n✅ Quality suite complete! Overall score: ${score}/100`);
      process.exit(score >= 80 ? 0 : 1);
    })
    .catch(error => {
      console.error("❌ Orchestrator failed:", error);
      process.exit(1);
    });
}

export { QualityOrchestrator };
