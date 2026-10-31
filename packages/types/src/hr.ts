import { z } from "zod";
import {
  UUIDSchema,
  ISODateStringSchema,
  CurrencyCodeSchema,
  TenantIdSchema,
  UserIdSchema,
  MoneySchema,
  AddressSchema,
  ContactInfoSchema,
  AuditFieldsSchema,
  EntityStatusSchema,
  PaginationInputSchema,
  PaginatedResponseSchema,
} from "./common";

export const EmployeeSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    employeeNumber: z.string().max(50),
    firstName: z.string().max(100),
    lastName: z.string().max(100),
    firstNameAr: z.string().max(100).optional(),
    lastNameAr: z.string().max(100).optional(),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    nationalId: z.string().max(20).optional(),
    passportNumber: z.string().max(50).optional(),
    dateOfBirth: ISODateStringSchema.optional(),
    gender: z.enum(["male", "female"]).optional(),
    nationality: z.string().max(100).optional(),
    maritalStatus: z
      .enum(["single", "married", "divorced", "widowed"])
      .optional(),
    hireDate: ISODateStringSchema,
    terminationDate: ISODateStringSchema.optional(),
    departmentId: UUIDSchema.optional(),
    positionId: UUIDSchema.optional(),
    gradeId: UUIDSchema.optional(),
    managerId: UUIDSchema.optional(),
    employmentType: z
      .enum(["full_time", "part_time", "contract", "intern", "temporary"])
      .default("full_time"),
    workScheduleId: UUIDSchema.optional(),
    bankAccount: z
      .object({
        bankName: z.string().max(100),
        accountNumber: z.string().max(50),
        iban: z.string().max(50).optional(),
      })
      .optional(),
    address: AddressSchema.optional(),
    emergencyContact: ContactInfoSchema.optional(),
    status: z
      .enum(["active", "on_leave", "terminated", "probation", "suspended"])
      .default("active"),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Employee = z.infer<typeof EmployeeSchema>;

export const DepartmentSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    name: z.string().max(200),
    nameAr: z.string().max(200).optional(),
    description: z.string().optional(),
    parentId: UUIDSchema.optional(),
    managerId: UUIDSchema.optional(),
    costCenterId: UUIDSchema.optional(),
    status: EntityStatusSchema.default("active"),
  })
  .merge(AuditFieldsSchema);
export type Department = z.infer<typeof DepartmentSchema>;

export const PositionSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    title: z.string().max(200),
    titleAr: z.string().max(200).optional(),
    description: z.string().optional(),
    departmentId: UUIDSchema.optional(),
    gradeId: UUIDSchema.optional(),
    minSalary: MoneySchema.optional(),
    maxSalary: MoneySchema.optional(),
    status: EntityStatusSchema.default("active"),
  })
  .merge(AuditFieldsSchema);
export type Position = z.infer<typeof PositionSchema>;

export const GradeSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    name: z.string().max(100),
    nameAr: z.string().max(100).optional(),
    level: z.number().int().positive(),
    minSalary: MoneySchema,
    maxSalary: MoneySchema,
    currency: CurrencyCodeSchema.default("SAR"),
    status: EntityStatusSchema.default("active"),
  })
  .merge(AuditFieldsSchema);
export type Grade = z.infer<typeof GradeSchema>;

export const LeaveTypeSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    code: z.string().max(50),
    name: z.string().max(100),
    nameAr: z.string().max(100).optional(),
    description: z.string().optional(),
    isPaid: z.boolean().default(true),
    requiresApproval: z.boolean().default(true),
    maxDaysPerYear: z.number().int().positive().optional(),
    carryForwardAllowed: z.boolean().default(false),
    maxCarryForwardDays: z.number().int().nonnegative().default(0),
    status: EntityStatusSchema.default("active"),
  })
  .merge(AuditFieldsSchema);
export type LeaveType = z.infer<typeof LeaveTypeSchema>;

export const LeaveRequestSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    employeeId: UUIDSchema,
    leaveTypeId: UUIDSchema,
    startDate: ISODateStringSchema,
    endDate: ISODateStringSchema,
    totalDays: z.number().positive(),
    reason: z.string().max(500),
    status: z
      .enum(["draft", "submitted", "approved", "rejected", "cancelled"])
      .default("draft"),
    approvedBy: UserIdSchema.optional(),
    approvedAt: ISODateStringSchema.optional(),
    rejectionReason: z.string().optional(),
    attachmentUrl: z.string().url().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

export const LeaveBalanceSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    employeeId: UUIDSchema,
    leaveTypeId: UUIDSchema,
    year: z.number().int().positive(),
    accruedDays: z.number().default(0),
    usedDays: z.number().default(0),
    carriedForwardDays: z.number().default(0),
    adjustedDays: z.number().default(0),
    balanceDays: z.number().default(0),
  })
  .merge(AuditFieldsSchema);
export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;

export const AttendanceSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    employeeId: UUIDSchema,
    date: ISODateStringSchema,
    checkIn: ISODateStringSchema.optional(),
    checkOut: ISODateStringSchema.optional(),
    breakDurationMinutes: z.number().int().nonnegative().default(0),
    workDurationMinutes: z.number().int().nonnegative().default(0),
    overtimeMinutes: z.number().int().nonnegative().default(0),
    status: z
      .enum([
        "present",
        "absent",
        "late",
        "early_departure",
        "half_day",
        "on_leave",
        "holiday",
      ])
      .default("present"),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Attendance = z.infer<typeof AttendanceSchema>;

export const PayrollRunSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    name: z.string().max(200),
    periodStart: ISODateStringSchema,
    periodEnd: ISODateStringSchema,
    payDate: ISODateStringSchema,
    status: z
      .enum(["draft", "processing", "approved", "paid", "cancelled"])
      .default("draft"),
    totalGross: MoneySchema.default({ amount: 0, currency: "SAR" }),
    totalDeductions: MoneySchema.default({ amount: 0, currency: "SAR" }),
    totalNet: MoneySchema.default({ amount: 0, currency: "SAR" }),
    employeeCount: z.number().int().nonnegative().default(0),
    processedAt: ISODateStringSchema.optional(),
    processedBy: UserIdSchema.optional(),
    paidAt: ISODateStringSchema.optional(),
    paidBy: UserIdSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type PayrollRun = z.infer<typeof PayrollRunSchema>;

export const PayslipSchema = z
  .object({
    id: UUIDSchema,
    tenantId: TenantIdSchema,
    payrollRunId: UUIDSchema,
    employeeId: UUIDSchema,
    basicSalary: MoneySchema,
    allowances: z
      .array(
        z.object({
          id: UUIDSchema,
          name: z.string(),
          nameAr: z.string().optional(),
          amount: MoneySchema,
          isTaxable: z.boolean().default(true),
        })
      )
      .default([]),
    deductions: z
      .array(
        z.object({
          id: UUIDSchema,
          name: z.string(),
          nameAr: z.string().optional(),
          amount: MoneySchema,
          isPreTax: z.boolean().default(false),
        })
      )
      .default([]),
    grossPay: MoneySchema,
    totalDeductions: MoneySchema,
    netPay: MoneySchema,
    status: z.enum(["draft", "generated", "approved", "paid"]).default("draft"),
    generatedAt: ISODateStringSchema.optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .merge(AuditFieldsSchema);
export type Payslip = z.infer<typeof PayslipSchema>;

export const EmployeeFilterSchema = z.object({
  search: z.string().optional(),
  departmentId: UUIDSchema.optional(),
  positionId: UUIDSchema.optional(),
  status: z
    .enum(["active", "on_leave", "terminated", "probation", "suspended"])
    .optional(),
  employmentType: z
    .enum(["full_time", "part_time", "contract", "intern", "temporary"])
    .optional(),
});
export type EmployeeFilter = z.infer<typeof EmployeeFilterSchema>;

export const LeaveRequestFilterSchema = z.object({
  employeeId: UUIDSchema.optional(),
  leaveTypeId: UUIDSchema.optional(),
  status: z
    .enum(["draft", "submitted", "approved", "rejected", "cancelled"])
    .optional(),
  startDateFrom: ISODateStringSchema.optional(),
  startDateTo: ISODateStringSchema.optional(),
});
export type LeaveRequestFilter = z.infer<typeof LeaveRequestFilterSchema>;

export const PaginatedEmployeesSchema = PaginatedResponseSchema(EmployeeSchema);
export type PaginatedEmployees = z.infer<typeof PaginatedEmployeesSchema>;

export const PaginatedDepartmentsSchema =
  PaginatedResponseSchema(DepartmentSchema);
export type PaginatedDepartments = z.infer<typeof PaginatedDepartmentsSchema>;

export const PaginatedPositionsSchema = PaginatedResponseSchema(PositionSchema);
export type PaginatedPositions = z.infer<typeof PaginatedPositionsSchema>;

export const PaginatedLeaveRequestsSchema =
  PaginatedResponseSchema(LeaveRequestSchema);
export type PaginatedLeaveRequests = z.infer<
  typeof PaginatedLeaveRequestsSchema
>;

export const PaginatedLeaveBalancesSchema =
  PaginatedResponseSchema(LeaveBalanceSchema);
export type PaginatedLeaveBalances = z.infer<
  typeof PaginatedLeaveBalancesSchema
>;

export const PaginatedAttendancesSchema =
  PaginatedResponseSchema(AttendanceSchema);
export type PaginatedAttendances = z.infer<typeof PaginatedAttendancesSchema>;

export const PaginatedPayrollRunsSchema =
  PaginatedResponseSchema(PayrollRunSchema);
export type PaginatedPayrollRuns = z.infer<typeof PaginatedPayrollRunsSchema>;

export const PaginatedPayslipsSchema = PaginatedResponseSchema(PayslipSchema);
export type PaginatedPayslips = z.infer<typeof PaginatedPayslipsSchema>;
