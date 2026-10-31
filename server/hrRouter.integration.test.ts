import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  testDb,
  createTestTenant,
  createTestUser,
  createTestContext,
} from "./vitest.integration.setup";
import * as schema from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("hrRouter integration", () => {
  let tenantId: number;
  let userId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let departmentId: number;
  let accountIds: number[];
  let branchId: number;

  beforeAll(async () => {
    const tenant = await createTestTenant(testDb, "HR Test Tenant");
    tenantId = tenant[0].id;

    const user = await createTestUser(testDb, tenantId, "hr@test.com");
    userId = user[0].id;

    const branch = await testDb
      .insert(schema.branches)
      .values({
        tenantId,
        name: "Main Branch",
        code: "MAIN",
        isMain: true,
      })
      .returning();
    branchId = branch[0].id;

    const accountsData = [
      { code: "7000", name: "Salary Expense", type: "expense" as const },
      {
        code: "2010",
        name: "Accrued Payroll Payable",
        type: "liability" as const,
      },
    ];

    const insertedAccounts = await testDb
      .insert(schema.accounts)
      .values(accountsData.map(a => ({ ...a, tenantId })))
      .returning();
    accountIds = insertedAccounts.map(a => a.id);

    const dept = await testDb
      .insert(schema.departments)
      .values({
        tenantId,
        code: "HR001",
        name: "Human Resources",
        isActive: true,
      })
      .returning();
    departmentId = dept[0].id;

    caller = appRouter.createCaller(createTestContext(tenantId, userId));
  });

  beforeEach(async () => {
    await testDb
      .delete(schema.payrollItems)
      .where(eq(schema.payrollItems.tenantId, tenantId));
    await testDb
      .delete(schema.payrollRuns)
      .where(eq(schema.payrollRuns.tenantId, tenantId));
    await testDb
      .delete(schema.attendance)
      .where(eq(schema.attendance.tenantId, tenantId));
    await testDb
      .delete(schema.employees)
      .where(eq(schema.employees.tenantId, tenantId));
  });

  it("employee: create → update → delete (soft)", async () => {
    const emp = await caller.erp.createEmployee({
      code: "EMP001",
      fullName: "Ahmed Ali",
      jobTitle: "Accountant",
      departmentId,
      salary: "50000",
      currency: "YER",
      hireDate: "2026-01-15",
      status: "active",
    });

    expect(emp.id).toBeDefined();
    expect(emp.code).toBe("EMP001");

    const updated = await caller.erp.updateEmployee({
      id: emp.id,
      fullName: "Ahmed Ali Updated",
      salary: "55000",
    });

    expect(updated.success).toBe(true);

    const afterUpdate = await testDb
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, emp.id));
    expect(afterUpdate[0].fullName).toBe("Ahmed Ali Updated");
    expect(afterUpdate[0].salary).toBe("55000");

    await caller.erp.deleteEmployee({ id: emp.id });

    const deleted = await testDb
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, emp.id));
    expect(deleted[0].deletedAt).not.toBeNull();
  });

  it("department: create → list → delete", async () => {
    const dept = await caller.erp.createDepartment({
      code: "IT001",
      name: "Information Technology",
      isActive: true,
    });

    expect(dept.id).toBeDefined();
    expect(dept.code).toBe("IT001");

    const list = await caller.erp.listDepartments();
    expect(list.length).toBeGreaterThanOrEqual(2);

    await caller.erp.deleteDepartment({ id: dept.id });

    const afterDelete = await testDb
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.id, dept.id));
    expect(afterDelete[0].deletedAt).not.toBeNull();
  });

  it("attendance: create → list with date filters", async () => {
    const emp = await caller.erp.createEmployee({
      code: "EMP002",
      fullName: "Sara Mohammed",
      jobTitle: "Developer",
      departmentId,
      salary: "60000",
      currency: "YER",
      hireDate: "2026-02-01",
      status: "active",
    });

    await caller.erp.createAttendance({
      employeeId: emp.id,
      date: "2026-03-01",
      status: "present",
      checkIn: "2026-03-01T08:00:00",
      checkOut: "2026-03-01T16:00:00",
    });

    await caller.erp.createAttendance({
      employeeId: emp.id,
      date: "2026-03-02",
      status: "present",
      checkIn: "2026-03-02T08:00:00",
      checkOut: "2026-03-02T16:00:00",
    });

    const allAttendance = await caller.erp.listAttendance({});
    expect(allAttendance.length).toBe(2);

    const filtered = await caller.erp.listAttendance({
      from: "2026-03-01",
      to: "2026-03-01",
      employeeId: emp.id,
    });
    expect(filtered.length).toBe(1);
    expect(filtered[0].status).toBe("present");
  });

  it("payroll: create run → posts GL entries", async () => {
    const emp1 = await caller.erp.createEmployee({
      code: "EMP003",
      fullName: "Khalid Omar",
      jobTitle: "Manager",
      departmentId,
      salary: "80000",
      currency: "YER",
      status: "active",
    });

    const emp2 = await caller.erp.createEmployee({
      code: "EMP004",
      fullName: "Fatima Hassan",
      jobTitle: "Assistant",
      departmentId,
      salary: "40000",
      currency: "YER",
      status: "active",
    });

    const run = await caller.erp.createPayrollRun({
      periodName: "2026-03",
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });

    expect(run.id).toBeDefined();
    expect(run.periodName).toBe("2026-03");
    expect(run.status).toBe("draft");

    const payrollItems = await testDb
      .select()
      .from(schema.payrollItems)
      .where(eq(schema.payrollItems.payrollRunId, run.id));
    expect(payrollItems.length).toBe(2);

    const journalEntries = await testDb
      .select()
      .from(schema.journalEntries)
      .where(eq(schema.journalEntries.sourceModule, "payroll"));
    expect(journalEntries.length).toBe(1);
    expect(journalEntries[0].status).toBe("posted");

    const transactions = await testDb
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.journalEntryId, journalEntries[0].id));
    expect(transactions.length).toBe(2);
    expect(transactions.some(t => t.type === "debit")).toBe(true);
    expect(transactions.some(t => t.type === "credit")).toBe(true);

    const totalDebit = transactions
      .filter(t => t.type === "debit")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalCredit = transactions
      .filter(t => t.type === "credit")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
    expect(totalDebit).toBe(120000);
  });

  it("leave: create employee with leave balance tracking", async () => {
    const emp = await caller.erp.createEmployee({
      code: "EMP005",
      fullName: "Omar Yousef",
      jobTitle: "Designer",
      departmentId,
      salary: "45000",
      currency: "YER",
      status: "active",
    });

    const employees = await caller.erp.listEmployees({});
    expect(employees.some(e => e.id === emp.id)).toBe(true);
  });
});

describe("projectRouter integration", () => {
  let tenantId: number;
  let userId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let customerId: number;
  let employeeId: number;

  beforeAll(async () => {
    const tenant = await createTestTenant(testDb, "Project Test Tenant");
    tenantId = tenant[0].id;

    const user = await createTestUser(testDb, tenantId, "project@test.com");
    userId = user[0].id;

    const customer = await testDb
      .insert(schema.customers)
      .values({
        tenantId,
        code: "CUST001",
        name: "Project Client",
        balance: "0",
      })
      .returning();
    customerId = customer[0].id;

    const emp = await testDb
      .insert(schema.employees)
      .values({
        tenantId,
        code: "EMP001",
        fullName: "Project Manager",
        jobTitle: "PM",
        salary: "100000",
        status: "active",
      })
      .returning();
    employeeId = emp[0].id;

    caller = appRouter.createCaller(createTestContext(tenantId, userId));
  });

  beforeEach(async () => {
    await testDb
      .delete(schema.projectTasks)
      .where(eq(schema.projectTasks.tenantId, tenantId));
    await testDb
      .delete(schema.projectMembers)
      .where(eq(schema.projectMembers.tenantId, tenantId));
    await testDb
      .delete(schema.projects)
      .where(eq(schema.projects.tenantId, tenantId));
  });

  it("project: create → update → add members → add tasks", async () => {
    const project = await caller.erp.createProject({
      code: "PRJ001",
      name: "Website Redesign",
      description: "Redesign company website",
      status: "planning",
      startDate: "2026-03-01",
      endDate: "2026-06-30",
      budget: "500000",
      managerId: employeeId,
      customerId,
    });

    expect(project.id).toBeDefined();
    expect(project.code).toBe("PRJ001");

    await caller.erp.updateProject({
      id: project.id,
      status: "active",
      budget: "550000",
    });

    const updated = await testDb
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, project.id));
    expect(updated[0].status).toBe("active");
    expect(updated[0].budget).toBe("550000");

    await caller.erp.addProjectMember({
      projectId: project.id,
      employeeId,
      roleInProject: "Project Manager",
    });

    const members = await caller.erp.listProjectMembers({
      projectId: project.id,
    });
    expect(members.length).toBe(1);
    expect(members[0].roleInProject).toBe("Project Manager");

    const task = await caller.erp.createTask({
      projectId: project.id,
      title: "Design homepage",
      description: "Create new homepage design",
      status: "todo",
      priority: "high",
      assigneeId: employeeId,
      dueDate: "2026-04-15",
      estimatedHours: "40",
    });

    expect(task.id).toBeDefined();

    const tasks = await caller.erp.listTasks({ projectId: project.id });
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe("Design homepage");
  });

  it("project: delete cascades to tasks and members", async () => {
    const project = await caller.erp.createProject({
      code: "PRJ002",
      name: "Mobile App",
      status: "planning",
    });

    await caller.erp.addProjectMember({
      projectId: project.id,
      employeeId,
      roleInProject: "Developer",
    });

    await caller.erp.createTask({
      projectId: project.id,
      title: "Setup repo",
      status: "todo",
    });

    await caller.erp.deleteProject({ id: project.id });

    const deletedProject = await testDb
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, project.id));
    expect(deletedProject.length).toBe(0);

    const tasks = await testDb
      .select()
      .from(schema.projectTasks)
      .where(eq(schema.projectTasks.projectId, project.id));
    expect(tasks.length).toBe(0);

    const members = await testDb
      .select()
      .from(schema.projectMembers)
      .where(eq(schema.projectMembers.projectId, project.id));
    expect(members.length).toBe(0);
  });
});
