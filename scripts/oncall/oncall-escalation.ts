#!/usr/bin/env tsx
/**
 * ALHUSAINIA Automated On-Call & Escalation
 * =========================================
 * PagerDuty integration with automated scheduling, escalation policies,
 * and incident response automation.
 */

import { EventEmitter } from "events";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

interface OnCallUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  timezone: string;
  pagerDutyId?: string;
  slackId?: string;
  skills: string[];
}

interface Schedule {
  id: string;
  name: string;
  timezone: string;
  users: OnCallUser[];
  rotation: "daily" | "weekly" | "custom";
  handoffTime: string; // HH:MM
  startDate: string; // ISO date
}

interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  levels: EscalationLevel[];
  repeatAfterMinutes?: number;
  repeatCount?: number;
}

interface EscalationLevel {
  level: number;
  delayMinutes: number;
  targets: EscalationTarget[];
  notifyVia: ("pagerduty" | "sms" | "email" | "slack" | "phone")[];
}

interface EscalationTarget {
  type: "user" | "schedule" | "team";
  id: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "triggered" | "acknowledged" | "resolved";
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assigneeId?: string;
  escalationPolicyId: string;
  currentLevel: number;
  acknowledgedBy?: string;
  timeline: IncidentEvent[];
}

interface IncidentEvent {
  timestamp: string;
  type: "triggered" | "acknowledged" | "escalated" | "reassigned" | "resolved" | "note_added";
  userId?: string;
  message: string;
  level?: number;
}

interface OnCallShift {
  userId: string;
  scheduleId: string;
  startTime: string;
  endTime: string;
  isOverride: boolean;
}

interface OnCallConfig {
  pagerDutyApiKey: string;
  pagerDutySubdomain: string;
  defaultEscalationPolicyId: string;
  schedules: Schedule[];
  escalationPolicies: EscalationPolicy[];
  users: OnCallUser[];
  demoMode?: boolean;
}

interface OnCallStatus {
  currentOnCall: OnCallUser | null;
  nextOnCall: OnCallUser | null;
  scheduleId: string;
  shiftStart: string;
  shiftEnd: string;
  isOverride: boolean;
}

const RESULTS_DIR = resolve(process.cwd(), "oncall-results");
if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });

// ============================================================================
// PAGERDUTY CLIENT
// ============================================================================

class PagerDutyClient {
  private apiKey: string;
  private subdomain: string;
  private baseUrl: string;
  private demoMode: boolean;

  constructor(apiKey: string, subdomain: string, demoMode = false) {
    this.apiKey = apiKey;
    this.subdomain = subdomain;
    this.baseUrl = `https://${subdomain}.pagerduty.com/api/v1`;
    this.demoMode = demoMode;
  }

  private async request(method: string, endpoint: string, data?: any) {
    if (this.demoMode) {
      // Return mock responses for demo mode
      if (endpoint === "/incidents" && method === "POST") {
        return {
          incident: {
            id: `INC-${Date.now()}`,
            title: data?.incident?.title || "Demo Incident",
            status: "triggered",
            created_at: new Date().toISOString(),
          },
        };
      }
      if (endpoint.startsWith("/incidents/") && method === "PUT") {
        return { incident: { id: endpoint.split("/")[2], status: data?.incident?.status || "acknowledged" } };
      }
      if (endpoint.startsWith("/incidents/") && endpoint.endsWith("/escalate")) {
        return { incident: { id: endpoint.split("/")[2], escalation_level: data?.escalation_level } };
      }
      return { users: [], schedules: [], escalation_policies: [] };
    }
    
    // Real implementation continues below...
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Authorization": `Token token=${this.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.pagerduty+json;version=2",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PagerDuty API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  async getCurrentOnCall(scheduleId: string): Promise<OnCallStatus> {
    const response = await this.request("GET", `/schedules/${scheduleId}/users?since=${new Date().toISOString()}&until=${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}`);
    // Parse PagerDuty response and return current on-call
    // This is a simplified version - real implementation would parse the full response
    return {
      currentOnCall: null,
      nextOnCall: null,
      scheduleId,
      shiftStart: new Date().toISOString(),
      shiftEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isOverride: false,
    };
  }

  async createIncident(data: {
    title: string;
    description: string;
    urgency: "high" | "low";
    serviceId: string;
    escalationPolicyId?: string;
    details?: Record<string, any>;
  }) {
    return this.request("POST", "/incidents", {
      incident: {
        type: "incident",
        title: data.title,
        service: { id: data.serviceId, type: "service_reference" },
        urgency: data.urgency,
        body: { type: "incident_body", details: data.description },
        escalation_policy: data.escalationPolicyId ? { id: data.escalationPolicyId, type: "escalation_policy_reference" } : undefined,
      },
    });
  }

  async acknowledgeIncident(incidentId: string, userId: string) {
    return this.request("PUT", `/incidents/${incidentId}`, {
      incident: {
        type: "incident",
        status: "acknowledged",
      },
    });
  }

  async resolveIncident(incidentId: string, userId: string, resolution?: string) {
    return this.request("PUT", `/incidents/${incidentId}`, {
      incident: {
        type: "incident",
        status: "resolved",
        resolution: resolution || "Resolved via automation",
      },
    });
  }

  async escalateIncident(incidentId: string, level: number) {
    return this.request("POST", `/incidents/${incidentId}/escalate`, {
      escalation_level: level,
    });
  }

  async getOnCallUsers(scheduleIds: string[]): Promise<OnCallUser[]> {
    // In real implementation, fetch from PagerDuty
    return [];
  }

  async createOverride(scheduleId: string, userId: string, start: Date, end: Date) {
    return this.request("POST", `/schedules/${scheduleId}/overrides`, {
      override: {
        user: { id: userId, type: "user_reference" },
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  }
}

// ============================================================================
// ON-CALL MANAGER
// ============================================================================

class OnCallManager extends EventEmitter {
  private client: PagerDutyClient;
  private config: OnCallConfig;
  private currentIncidents: Map<string, Incident> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: OnCallConfig) {
    super();
    this.config = config;
    this.client = new PagerDutyClient(
      config.pagerDutyApiKey, 
      config.pagerDutySubdomain, 
      config.demoMode ?? false
    );
  }

  // Get current on-call for a schedule
  async getCurrentOnCall(scheduleId: string): Promise<OnCallStatus> {
    return this.client.getCurrentOnCall(scheduleId);
  }

  // Get all on-call users across schedules
  async getAllOnCall(): Promise<OnCallStatus[]> {
    const statuses = await Promise.all(
      this.config.schedules.map(s => this.getCurrentOnCall(s.id))
    );
    return statuses;
  }

  // Create incident and trigger escalation
  async triggerIncident(data: {
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    serviceId: string;
    escalationPolicyId?: string;
    source: "alert" | "manual" | "automation";
    metadata?: Record<string, any>;
  }): Promise<Incident> {
    const urgency = data.severity === "critical" || data.severity === "high" ? "high" : "low";
    const policyId = data.escalationPolicyId || this.config.defaultEscalationPolicyId;
    const policy = this.config.escalationPolicies.find(p => p.id === policyId);
    
    if (!policy) {
      throw new Error(`Escalation policy not found: ${policyId}`);
    }

    // Create incident in PagerDuty
    const pdIncident = await this.client.createIncident({
      title: data.title,
      description: data.description,
      urgency: data.severity === "critical" ? "high" : "low",
      serviceId: data.serviceId,
      escalationPolicyId: policyId,
      details: {
        severity: data.severity,
        source: data.source,
        metadata: data.metadata,
        triggeredBy: "automation",
      },
    });

    // Create local incident record
    const incident: Incident = {
      id: pdIncident.incident.id,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: "triggered",
      createdAt: new Date().toISOString(),
      escalationPolicyId: policyId,
      currentLevel: 0,
      timeline: [{
        timestamp: new Date().toISOString(),
        type: "triggered",
        message: `Incident triggered: ${data.title}`,
      }],
    };

    this.currentIncidents.set(incident.id, incident);
    this.emit("incident:triggered", incident);

    // Start escalation timer for first level
    this.scheduleEscalation(incident.id, policy, 0);

    console.log(`🚨 Incident triggered: ${incident.title} (${incident.id})`);
    return incident;
  }

  // Schedule escalation for a level
  private scheduleEscalation(incidentId: string, policy: EscalationPolicy, currentLevel: number) {
    if (currentLevel >= policy.levels.length) {
      console.log(`Incident ${incidentId}: Reached max escalation level`);
      return;
    }

    const level = policy.levels[currentLevel];
    const delayMs = level.delayMinutes * 60 * 1000;

    const timer = setTimeout(async () => {
      await this.escalateIncident(incidentId, policy, currentLevel + 1);
    }, delayMs);

    this.escalationTimers.set(`${incidentId}-${currentLevel}`, timer);
    console.log(`⏰ Scheduled escalation level ${currentLevel + 1} for incident ${incidentId} in ${level.delayMinutes} minutes`);
  }

  // Escalate incident to next level
  async escalateIncident(incidentId: string, policy: EscalationPolicy, nextLevel: number) {
    const incident = this.currentIncidents.get(incidentId);
    if (!incident) return;

    if (nextLevel >= policy.levels.length) {
      console.log(`Incident ${incidentId}: Max escalation level reached`);
      return;
    }

    const level = policy.levels[nextLevel];
    
    try {
      // Escalate in PagerDuty
      await this.client.escalateIncident(incidentId, nextLevel + 1);
      
      // Update local record
      incident.currentLevel = nextLevel;
      incident.timeline.push({
        timestamp: new Date().toISOString(),
        type: "escalated",
        message: `Escalated to level ${nextLevel + 1}`,
        level: nextLevel + 1,
      });

      this.emit("incident:escalated", { incident, level: nextLevel + 1 });

      // Notify targets
      for (const target of level.targets) {
        await this.notifyTarget(target, incident, level);
      }

      // Schedule next escalation
      this.scheduleEscalation(incidentId, policy, nextLevel + 1);

      console.log(`📈 Incident ${incidentId} escalated to level ${nextLevel + 1}`);
    } catch (error) {
      console.error(`Failed to escalate incident ${incidentId}:`, error);
    }
  }

  // Notify escalation target
  private async notifyTarget(target: EscalationTarget, incident: Incident, level: EscalationLevel) {
    // In real implementation, send notifications via:
    // - PagerDuty (already done via API)
    // - SMS via Twilio
    // - Email via SendGrid
    // - Slack via webhook
    // - Phone call via Twilio
    
    console.log(`📢 Notifying ${target.type} ${target.id} for incident ${incident.id} via ${level.notifyVia.join(", ")}`);
    
    // Example Slack notification
    if (level.notifyVia.includes("slack")) {
      await this.sendSlackNotification(target.id, incident, level);
    }
  }

  private async sendSlackNotification(channelId: string, incident: Incident, level: EscalationLevel) {
    // In real implementation: post to Slack webhook
    console.log(`[Slack] Would notify ${channelId} about incident ${incident.id}`);
  }

  // Acknowledge incident
  async acknowledgeIncident(incidentId: string, userId: string): Promise<void> {
    const incident = this.currentIncidents.get(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    await this.client.acknowledgeIncident(incidentId, userId);
    
    incident.status = "acknowledged";
    incident.acknowledgedAt = new Date().toISOString();
    incident.acknowledgedBy = userId;
    incident.timeline.push({
      timestamp: new Date().toISOString(),
      type: "acknowledged",
      userId,
      message: `Incident acknowledged by ${userId}`,
    });

    // Clear escalation timers
    this.clearEscalationTimers(incidentId);

    this.emit("incident:acknowledged", { incident, userId });
    console.log(`✅ Incident ${incidentId} acknowledged by ${userId}`);
  }

  // Resolve incident
  async resolveIncident(incidentId: string, userId: string, resolution?: string): Promise<void> {
    const incident = this.currentIncidents.get(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    await this.client.resolveIncident(incidentId, userId, resolution);
    
    incident.status = "resolved";
    incident.resolvedAt = new Date().toISOString();
    incident.timeline.push({
      timestamp: new Date().toISOString(),
      type: "resolved",
      userId,
      message: `Incident resolved by ${userId}: ${resolution || "No resolution provided"}`,
    });

    this.clearEscalationTimers(incidentId);
    this.emit("incident:resolved", { incident, userId });
    console.log(`✅ Incident ${incidentId} resolved by ${userId}`);
  }

  private clearEscalationTimers(incidentId: string) {
    for (const [key, timer] of this.escalationTimers.entries()) {
      if (key.startsWith(incidentId)) {
        clearTimeout(timer);
        this.escalationTimers.delete(key);
      }
    }
  }

  // Get incident details
  getIncident(incidentId: string): Incident | undefined {
    return this.currentIncidents.get(incidentId);
  }

  // Get all active incidents
  getActiveIncidents(): Incident[] {
    return Array.from(this.currentIncidents.values())
      .filter(i => i.status !== "resolved");
  }

  // Get on-call schedule for a user
  async getUserSchedule(userId: string, days: number = 14): Promise<OnCallShift[]> {
    // In real implementation, fetch from PagerDuty
    return [];
  }

  // Create schedule override
  async createOverride(scheduleId: string, userId: string, start: Date, end: Date): Promise<void> {
    await this.client.createOverride(scheduleId, userId, start, end);
    console.log(`📅 Created override for user ${userId} on schedule ${scheduleId}`);
  }

  // Get on-call report
  async generateOnCallReport(): Promise<string> {
    const statuses = await this.getAllOnCall();
    const activeIncidents = this.getActiveIncidents();

    let report = `
# On-Call Status Report
Generated: ${new Date().toISOString()}

## Current On-Call
`;

    for (const status of statuses) {
      if (status.currentOnCall) {
        report += `- **${status.scheduleId}**: ${status.currentOnCall.name} (${status.currentOnCall.email}) - Shift: ${status.shiftStart} to ${status.shiftEnd}\n`;
      } else {
        report += `- **${status.scheduleId}**: No one on call ⚠️\n`;
      }
    }

    report += `\n## Active Incidents (${activeIncidents.length})\n`;
    
    for (const incident of activeIncidents) {
      report += `- **${incident.title}** (${incident.severity}) - ${incident.status} - Level ${incident.currentLevel} - Since ${incident.createdAt}\n`;
    }

    return report;
  }
}

// ============================================================================
// ESCALATION POLICY BUILDER
// ============================================================================

function createDefaultEscalationPolicy(): EscalationPolicy {
  return {
    id: "default",
    name: "Default Escalation Policy",
    description: "Standard escalation for production incidents",
    levels: [
      {
        level: 1,
        delayMinutes: 5,
        targets: [
          { type: "schedule", id: "primary-oncall" },
        ],
        notifyVia: ["pagerduty", "slack", "sms"],
      },
      {
        level: 2,
        delayMinutes: 15,
        targets: [
          { type: "schedule", id: "primary-oncall" },
          { type: "schedule", id: "secondary-oncall" },
        ],
        notifyVia: ["pagerduty", "slack", "sms", "phone"],
      },
      {
        level: 3,
        delayMinutes: 30,
        targets: [
          { type: "schedule", id: "primary-oncall" },
          { type: "schedule", id: "secondary-oncall" },
          { type: "user", id: "engineering-lead" },
        ],
        notifyVia: ["pagerduty", "slack", "sms", "phone", "email"],
      },
      {
        level: 4,
        delayMinutes: 60,
        targets: [
          { type: "user", id: "engineering-lead" },
          { type: "user", id: "cto" },
        ],
        notifyVia: ["pagerduty", "slack", "sms", "phone", "email"],
      },
    ],
    repeatAfterMinutes: 120,
    repeatCount: 2,
  };
}

function createCriticalEscalationPolicy(): EscalationPolicy {
  return {
    id: "critical",
    name: "Critical Incident Escalation",
    description: "Fast-track escalation for critical/SEV-1 incidents",
    levels: [
      {
        level: 1,
        delayMinutes: 2,
        targets: [
          { type: "schedule", id: "primary-oncall" },
        ],
        notifyVia: ["pagerduty", "slack", "sms", "phone"],
      },
      {
        level: 2,
        delayMinutes: 5,
        targets: [
          { type: "schedule", id: "primary-oncall" },
          { type: "schedule", id: "secondary-oncall" },
        ],
        notifyVia: ["pagerduty", "slack", "sms", "phone"],
      },
      {
        level: 3,
        delayMinutes: 10,
        targets: [
          { type: "user", id: "engineering-lead" },
          { type: "user", id: "cto" },
        ],
        notifyVia: ["pagerduty", "slack", "sms", "phone", "email"],
      },
    ],
  };
}

// ============================================================================
// AUTOMATED INCIDENT RESPONSE
// ============================================================================

class AutomatedIncidentResponse {
  private onCallManager: OnCallManager;

  constructor(onCallManager: OnCallManager) {
    this.onCallManager = onCallManager;
  }

  // Auto-trigger incident from alert
  async handleAlert(alert: {
    name: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    serviceId: string;
    source: string;
    metadata?: Record<string, any>;
  }) {
    // Check if we should auto-create incident
    if (alert.severity === "critical" || alert.severity === "high") {
      return this.onCallManager.triggerIncident({
        title: `[AUTO] ${alert.name}`,
        description: alert.description,
        severity: alert.severity,
        serviceId: alert.serviceId,
        source: "automation",
        metadata: alert.metadata,
      });
    }
    
    // For medium/low, create but don't escalate immediately
    return this.onCallManager.triggerIncident({
      title: `[AUTO] ${alert.name}`,
      description: alert.description,
      severity: alert.severity,
      serviceId: alert.serviceId,
      source: "automation",
      metadata: alert.metadata,
    });
  }

  // Auto-resolve known patterns
  async autoResolve(incidentId: string, resolution: string) {
    const incident = this.onCallManager.getIncident(incidentId);
    if (!incident) return false;

    // Check for auto-resolution patterns
    const autoResolvePatterns = [
      { pattern: "disk space recovered", condition: () => checkDiskSpace() > 20 },
      { pattern: "cpu load normalized", condition: () => checkCpuLoad() < 80 },
      { pattern: "database connections normalized", condition: () => checkDbConnections() < 80 },
    ];

    for (const pattern of autoResolvePatterns) {
      if (incident.title.toLowerCase().includes(pattern.pattern.toLowerCase())) {
        if (await pattern.condition()) {
          await this.onCallManager.resolveIncident(incidentId, "automation", `Auto-resolved: ${pattern.pattern}`);
          return true;
        }
      }
    }

    return false;
  }
}

// Health checks for auto-resolution
async function checkDiskSpace(): Promise<number> {
  // In real implementation: check disk space
  return 50;
}

async function checkCpuLoad(): Promise<number> {
  return 50;
}

async function checkDbConnections(): Promise<number> {
  return 50;
}

// ============================================================================
// MAIN - DEMO/TEST
// ============================================================================

async function main() {
  console.log("📞 ALHUSAINIA On-Call & Escalation System");
  console.log("==========================================\n");

  // Check for PagerDuty config
  const apiKey = process.env.PAGERDUTY_API_KEY;
  const subdomain = process.env.PAGERDUTY_SUBDOMAIN;

  if (!apiKey || !subdomain) {
    console.log("⚠️  PagerDuty credentials not configured (PAGERDUTY_API_KEY, PAGERDUTY_SUBDOMAIN)");
    console.log("   Running in demo mode...\n");
  }

  // Demo configuration
  const config: OnCallConfig = {
    pagerDutyApiKey: apiKey || "demo-key",
    pagerDutySubdomain: subdomain || "demo",
    defaultEscalationPolicyId: "default",
    schedules: [
      {
        id: "primary-oncall",
        name: "Primary On-Call",
        timezone: "UTC",
        users: [],
        rotation: "weekly",
        handoffTime: "09:00",
        startDate: "2024-01-01",
      },
      {
        id: "secondary-oncall",
        name: "Secondary On-Call",
        timezone: "UTC",
        users: [],
        rotation: "weekly",
        handoffTime: "09:00",
        startDate: "2024-01-01",
      },
    ],
    escalationPolicies: [
      createDefaultEscalationPolicy(),
      createCriticalEscalationPolicy(),
    ],
    users: [],
    demoMode: !apiKey || !subdomain,
  };

  const onCallManager = new OnCallManager(config);
  const autoResponse = new AutomatedIncidentResponse(onCallManager);

  // Event listeners
  onCallManager.on("incident:triggered", (incident) => {
    console.log(`\n🔔 EVENT: Incident triggered - ${incident.title}`);
  });

  onCallManager.on("incident:escalated", ({ incident, level }) => {
    console.log(`\n📈 EVENT: Incident ${incident.id} escalated to level ${level}`);
  });

  onCallManager.on("incident:acknowledged", ({ incident, userId }) => {
    console.log(`\n✅ EVENT: Incident ${incident.id} acknowledged by ${userId}`);
  });

  onCallManager.on("incident:resolved", ({ incident, userId }) => {
    console.log(`\n✅ EVENT: Incident ${incident.id} resolved by ${userId}`);
  });

  // Demo: Show current on-call
  console.log("\n📋 Current On-Call Status:");
  console.log("--------------------------");
  console.log("(Demo mode - no real PagerDuty connection)");
  console.log("Primary On-Call: Would show current on-call engineer");
  console.log("Secondary On-Call: Would show backup engineer");

  // Demo: Trigger test incident
  console.log("\n🚨 Triggering test incident...");
  const incident = await onCallManager.triggerIncident({
    title: "Test Incident - High CPU Load",
    description: "CPU load on api-server exceeded 90% for 5 minutes",
    severity: "high",
    serviceId: "api-service",
    escalationPolicyId: "default",
    source: "automation",
    metadata: { cpu: "95%", duration: "5min", host: "api-1" },
  });

  console.log(`Incident created: ${incident.id}`);

  // Simulate acknowledgment after 30 seconds
  setTimeout(async () => {
    console.log("\n⏰ Simulating acknowledgment...");
    await onCallManager.acknowledgeIncident(incident.id, "engineer-1");
  }, 2000);

  // Simulate resolution after 1 minute
  setTimeout(async () => {
    await onCallManager.resolveIncident(incident.id, "engineer-1", "CPU load normalized after scaling");
    
    // Generate report
    const report = await onCallManager.generateOnCallReport();
    console.log("\n📋 On-Call Report:");
    console.log(report);
    
    console.log("\n✅ Demo completed");
    process.exit(0);
  }, 60000);
}

main().catch(console.error);