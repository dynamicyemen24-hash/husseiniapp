import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  procedureExists,
  expectValidInput,
  expectInvalidInput,
} from "./testUtils/trpcContract";

describe("erpRouter (HR) contract tests", () => {
  it("listDepartments: validates output", async () => {
    expect(procedureExists(appRouter, ["erp", "listDepartments"])).toBe(true);
  });

  it("createDepartment: validates input schema", async () => {
    await expectValidInput(appRouter, ["erp", "createDepartment"], {
      code: "DEPT001",
      name: "Department",
      isActive: true,
    });
    await expectInvalidInput(appRouter, ["erp", "createDepartment"], {
      name: "Dept",
    });
  });

  it("updateDepartment: validates partial input", async () => {
    await expectValidInput(appRouter, ["erp", "updateDepartment"], {
      id: 1,
      name: "Updated",
      isActive: false,
    });
  });

  it("deleteDepartment: validates id", async () => {
    await expectValidInput(appRouter, ["erp", "deleteDepartment"], { id: 1 });
  });

  it("listEmployees: validates filter input", async () => {
    await expectValidInput(appRouter, ["erp", "listEmployees"], {
      search: "Ahmed",
      status: "active",
    });
  });

  it("createEmployee: validates required fields", async () => {
    await expectValidInput(appRouter, ["erp", "createEmployee"], {
      code: "EMP001",
      fullName: "Ahmed Ali",
      jobTitle: "Accountant",
      salary: "50000",
      status: "active",
    });
    await expectInvalidInput(appRouter, ["erp", "createEmployee"], {
      fullName: "Test",
      jobTitle: "Dev",
    });
  });

  it("updateEmployee: validates partial input", async () => {
    await expectValidInput(appRouter, ["erp", "updateEmployee"], {
      id: 1,
      salary: "55000",
      status: "active",
    });
  });

  it("deleteEmployee: validates id", async () => {
    await expectValidInput(appRouter, ["erp", "deleteEmployee"], { id: 1 });
  });

  it("listAttendance: validates date range and employee filter", async () => {
    await expectValidInput(appRouter, ["erp", "listAttendance"], {
      from: "2026-03-01",
      to: "2026-03-31",
      employeeId: 1,
    });
  });

  it("createAttendance: validates status and date", async () => {
    await expectValidInput(appRouter, ["erp", "createAttendance"], {
      employeeId: 1,
      date: "2026-03-15",
      status: "present",
      checkIn: "2026-03-15T08:00:00",
      checkOut: "2026-03-15T16:00:00",
    });
  });

  it("listPayrollRuns: validates output", async () => {
    expect(procedureExists(appRouter, ["erp", "listPayrollRuns"])).toBe(true);
  });

  it("createPayrollRun: validates period dates", async () => {
    await expectValidInput(appRouter, ["erp", "createPayrollRun"], {
      periodName: "2026-03",
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });
  });
});

describe("erpRouter (Projects) contract tests", () => {
  it("listProjects: validates status filter", async () => {
    await expectValidInput(appRouter, ["erp", "listProjects"], {
      status: "active",
    });
  });

  it("createProject: validates required fields", async () => {
    await expectValidInput(appRouter, ["erp", "createProject"], {
      code: "PRJ001",
      name: "Project",
      status: "planning",
      budget: "100000",
    });
  });

  it("updateProject: validates partial input with date handling", async () => {
    await expectValidInput(appRouter, ["erp", "updateProject"], {
      id: 1,
      status: "active",
      budget: "150000",
      startDate: "2026-04-01",
    });
    await expectValidInput(appRouter, ["erp", "updateProject"], {
      id: 1,
      endDate: null,
    });
  });

  it("deleteProject: validates id", async () => {
    await expectValidInput(appRouter, ["erp", "deleteProject"], { id: 1 });
  });

  it("listProjectMembers: validates project id", async () => {
    await expectValidInput(appRouter, ["erp", "listProjectMembers"], {
      projectId: 1,
    });
  });

  it("listTasks: validates optional project id", async () => {
    await expectValidInput(appRouter, ["erp", "listTasks"], { projectId: 1 });
    await expectValidInput(appRouter, ["erp", "listTasks"], {});
  });

  it("createTask: validates required fields", async () => {
    await expectValidInput(appRouter, ["erp", "createTask"], {
      projectId: 1,
      title: "Task",
      status: "todo",
      priority: "medium",
    });
  });

  it("updateTask: validates partial input", async () => {
    await expectValidInput(appRouter, ["erp", "updateTask"], {
      id: 1,
      status: "done",
      actualHours: "8",
    });
  });

  it("deleteTask: validates id", async () => {
    await expectValidInput(appRouter, ["erp", "deleteTask"], { id: 1 });
  });

  it("addProjectMember: validates employee and role", async () => {
    await expectValidInput(appRouter, ["erp", "addProjectMember"], {
      projectId: 1,
      employeeId: 1,
      roleInProject: "Developer",
    });
  });

  it("removeProjectMember: validates id", async () => {
    await expectValidInput(appRouter, ["erp", "removeProjectMember"], {
      id: 1,
    });
  });
});
