/**
 * Healthcare & Patient Management Router
 * HIPAA-compliant patient registry, appointments, medical records
 * Features: Patient registry, Appointments, Medical records, Vitals, ICD codes
 * Standards: HIPAA, HL7 FHIR, ICD-10, SNOMED CT, ICD-9, ICPC-2
 */

import { z } from "zod";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { PERMISSIONS } from "../shared/permissions";
import { dbOrThrow } from "./db";
import { eq, and, gte, lte, desc, asc, or, sql } from "drizzle-orm";
import {
  patients,
  appointments,
  medicalRecords,
  medicalRecordEntries,
  vitalSignRecords,
  patientConsents,
  healthcareFacilities,
  healthcareProviders,
  icdCodes,
} from "../drizzle/schema";
import { auditLog } from "./_core/auditLog";

// â”€â”€â”€ Input Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const patientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  localFirstName: z.string().optional(),
  localLastName: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]),
  dateOfBirth: z.string(),
  age: z.number().optional(),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"])
    .optional(),
  nationality: z.string().optional(),
  nationalId: z.string().optional(),
  passportNumber: z.string().optional(),
  maritalStatus: z.string().optional(),
  occupation: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1).max(50),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceCardNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  primaryProviderId: z.number().optional(),
  primaryFacilityId: z.number().optional(),
  allergies: z
    .array(
      z.object({
        allergen: z.string(),
        severity: z.string(),
        reaction: z.string().optional(),
      })
    )
    .optional(),
  chronicConditions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isVIP: z.boolean().optional(),
});

const appointmentSchema = z.object({
  patientId: z.number(),
  providerId: z.number(),
  facilityId: z.number(),
  type: z.enum([
    "new_patient",
    "follow_up",
    "consultation",
    "procedure",
    "emergency",
    "routine",
    "telemedicine",
  ]),
  visitType: z
    .enum([
      "outpatient",
      "inpatient",
      "emergency",
      "telemedicine",
      "home_visit",
    ])
    .optional(),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  scheduledEndTime: z.string().optional(),
  duration: z.number().optional(),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  isFirstVisit: z.boolean().optional(),
  isTelemedicine: z.boolean().optional(),
  consultationFee: z.number().optional(),
});

const vitalSignsSchema = z.object({
  patientId: z.number(),
  recordId: z.number().optional(),
  appointmentId: z.number().optional(),
  temperature: z.number().optional(),
  temperatureUnit: z.string().optional(),
  heartRate: z.number().optional(),
  respiratoryRate: z.number().optional(),
  bloodPressureSystolic: z.number().optional(),
  bloodPressureDiastolic: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  bmi: z.number().optional(),
  waistCircumference: z.number().optional(),
  painLevel: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
});

const diagnosisSchema = z.object({
  recordId: z.number(),
  patientId: z.number(),
  diagnosisType: z.enum([
    "primary",
    "secondary",
    "complication",
    "cause_of_death",
  ]),
  icdCode: z.string(),
  icdCodeSystem: z.enum(["ICD10", "ICD9", "ICPC2", "SNOMED_CT"]).optional(),
  diagnosisDescription: z.string(),
  isConfirmed: z.boolean().optional(),
  severity: z.string().optional(),
  notes: z.string().optional(),
});

const medicalRecordSchema = z.object({
  patientId: z.number(),
  appointmentId: z.number().optional(),
  visitType: z.enum([
    "outpatient",
    "inpatient",
    "emergency",
    "telemedicine",
    "home_visit",
  ]),
  providerId: z.number(),
  facilityId: z.number(),
  visitDate: z.string(),
  admissionDate: z.string().optional(),
  chiefComplaint: z.string().optional(),
  historyOfPresentIllness: z.string().optional(),
  physicalExamination: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

const consentSchema = z.object({
  patientId: z.number(),
  consentType: z.string(),
  description: z.string(),
  version: z.string().optional(),
  isGranted: z.boolean(),
});

// Helper: Generate patient/appointment number
function genNumber(prefix: string, tenantId: number, sequence: number): string {
  return `${prefix}-${tenantId}-${String(Date.now()).slice(-6)}-${String(sequence).padStart(3, "0")}`;
}

// â”€â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const healthcareRouter = router({
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // FACILITIES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  listFacilities: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    // PAGINATION: hard cap 200 — facilities per tenant are few, but the
    // mandatory-limit audit requires every list to be bounded.
    return db
      .select()
      .from(healthcareFacilities)
      .where(
        and(
          eq(healthcareFacilities.tenantId, ctx.tenantId),
          eq(healthcareFacilities.isActive, true)
        )
      )
      .orderBy(asc(healthcareFacilities.name))
      .limit(200);
  }),

  getFacility: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return null;
      const db = await dbOrThrow();
      const result = await db
        .select()
        .from(healthcareFacilities)
        .where(
          and(
            eq(healthcareFacilities.tenantId, ctx.tenantId),
            eq(healthcareFacilities.id, input.id)
          )
        )
        .limit(1);
      return result[0] || null;
    }),

  createFacility: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        type: z.string(),
        specialty: z.string().optional(),
        department: z.string().optional(),
        branchId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const [facility] = await db
        .insert(healthcareFacilities)
        .values({
          tenantId: ctx.tenantId,
          ...input,
        })
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.facility.create",
        severity: "info",
        outcome: "success",
        resource: "healthcare_facilities",
        resourceId: facility.id?.toString(),
        details: { name: input.name, type: input.type },
      });

      return facility;
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PROVIDERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  listProviders: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];
    const db = await dbOrThrow();
    return db
      .select()
      .from(healthcareProviders)
      .where(
        and(
          eq(healthcareProviders.tenantId, ctx.tenantId),
          eq(healthcareProviders.isActive, true)
        )
      )
      .orderBy(asc(healthcareProviders.title));
  }),

  listProvidersByFacility: tenantProcedure
    .input(z.object({ facilityId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();
      return db
        .select()
        .from(healthcareProviders)
        .where(
          and(
            eq(healthcareProviders.tenantId, ctx.tenantId),
            eq(healthcareProviders.facilityId, input.facilityId),
            eq(healthcareProviders.isActive, true)
          )
        )
        .orderBy(asc(healthcareProviders.title));
    }),

  createProvider: tenantProcedure
    .input(
      z.object({
        employeeId: z.number().optional(),
        facilityId: z.number(),
        licenseNumber: z.string().optional(),
        specialization: z.string(),
        title: z.string().optional(),
        qualifications: z.array(z.string()).optional(),
        yearsExperience: z.number().optional(),
        consultationFee: z.number().optional(),
        followUpFee: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const insertValues: any = {
        tenantId: ctx.tenantId,
        facilityId: input.facilityId,
        specialization: input.specialization,
      };
      if (input.employeeId !== undefined)
        insertValues.employeeId = input.employeeId;
      if (input.licenseNumber !== undefined)
        insertValues.licenseNumber = input.licenseNumber;
      if (input.title !== undefined) insertValues.title = input.title;
      if (input.qualifications !== undefined)
        insertValues.qualifications = input.qualifications;
      if (input.yearsExperience !== undefined)
        insertValues.yearsExperience = input.yearsExperience;
      if (input.consultationFee !== undefined)
        insertValues.consultationFee = String(input.consultationFee);
      if (input.followUpFee !== undefined)
        insertValues.followUpFee = String(input.followUpFee);

      const [provider] = await db
        .insert(healthcareProviders)
        .values(insertValues)
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.provider.create",
        severity: "info",
        outcome: "success",
        resource: "healthcare_providers",
        resourceId: provider.id?.toString(),
        details: { specialization: input.specialization },
      });

      return provider;
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PATIENTS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  listPatients: tenantProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
        activeOnly: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return { patients: [], total: 0 };
      const db = await dbOrThrow();

      const { search, page, limit, activeOnly } = input;
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(patients.tenantId, ctx.tenantId)];
      if (activeOnly) conditions.push(eq(patients.isActive, true));
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            sql`${patients.fullName} ILIKE ${searchPattern}`,
            sql`${patients.patientNumber} ILIKE ${searchPattern}`,
            sql`${patients.phone} ILIKE ${searchPattern}`,
            sql`${patients.nationalId} ILIKE ${searchPattern}`
          )!
        );
      }

      const whereClause = and(...conditions);

      const [patientsList, countResult] = await Promise.all([
        db
          .select()
          .from(patients)
          .where(whereClause)
          .orderBy(desc(patients.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(patients)
          .where(whereClause),
      ]);

      return {
        patients: patientsList,
        total: Number(countResult[0]?.count ?? 0),
        page,
        limit,
        totalPages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
      };
    }),

  getPatient: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return null;
      const db = await dbOrThrow();
      const result = await db
        .select()
        .from(patients)
        .where(
          and(eq(patients.tenantId, ctx.tenantId), eq(patients.id, input.id))
        )
        .limit(1);
      return result[0] || null;
    }),

  getPatientByNumber: tenantProcedure
    .input(z.object({ patientNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return null;
      const db = await dbOrThrow();
      const result = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.tenantId, ctx.tenantId),
            eq(patients.patientNumber, input.patientNumber)
          )
        )
        .limit(1);
      return result[0] || null;
    }),

  createPatient: tenantProcedure
    .use(requirePermissions(PERMISSIONS.HEALTHCARE_PATIENTS_MANAGE))
    .input(patientSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const seq = Math.floor(Math.random() * 999);
      const patientNumber = genNumber("PT", ctx.tenantId, seq);
      const fullName = `${input.firstName} ${input.lastName}`;

      const [patient] = await db
        .insert(patients)
        .values({
          tenantId: ctx.tenantId,
          patientNumber,
          fullName,
          ...input,
          dateOfBirth: new Date(input.dateOfBirth),
        })
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.patient.create",
        severity: "info",
        outcome: "success",
        resource: "patients",
        resourceId: patient.id?.toString(),
        details: { patientNumber, fullName },
      });

      return patient;
    }),

  updatePatient: tenantProcedure
    .input(z.object({ id: z.number(), data: patientSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const fullName =
        input.data.firstName && input.data.lastName
          ? `${input.data.firstName} ${input.data.lastName}`
          : undefined;

      const { dateOfBirth, ...dataRest } = input.data;
      const [patient] = await db
        .update(patients)
        .set({
          ...dataRest,
          ...(dateOfBirth !== undefined
            ? { dateOfBirth: new Date(dateOfBirth) }
            : {}),
          fullName,
          updatedAt: new Date(),
        })
        .where(
          and(eq(patients.tenantId, ctx.tenantId), eq(patients.id, input.id))
        )
        .returning();

      if (!patient) throw new Error("Patient not found");

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.patient.update",
        severity: "info",
        outcome: "success",
        resource: "patients",
        resourceId: patient.id?.toString(),
      });

      return patient;
    }),

  deactivatePatient: tenantProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const [patient] = await db
        .update(patients)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(eq(patients.tenantId, ctx.tenantId), eq(patients.id, input.id))
        )
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.patient.deactivate",
        severity: "warning",
        outcome: "success",
        resource: "patients",
        resourceId: patient.id?.toString(),
        details: { reason: input.reason },
      });

      return patient;
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // APPOINTMENTS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  listAppointments: tenantProcedure
    .input(
      z.object({
        patientId: z.number().optional(),
        providerId: z.number().optional(),
        facilityId: z.number().optional(),
        date: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z
          .enum([
            "scheduled",
            "confirmed",
            "checked_in",
            "in_progress",
            "completed",
            "cancelled",
            "no_show",
            "rescheduled",
          ])
          .optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return { appointments: [], total: 0 };
      const db = await dbOrThrow();

      const {
        patientId,
        providerId,
        facilityId,
        date,
        startDate,
        endDate,
        status,
        page,
        limit,
      } = input;
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(appointments.tenantId, ctx.tenantId)];
      if (patientId) conditions.push(eq(appointments.patientId, patientId));
      if (providerId) conditions.push(eq(appointments.providerId, providerId));
      if (facilityId) conditions.push(eq(appointments.facilityId, facilityId));
      if (status) conditions.push(eq(appointments.status, status));
      if (date) conditions.push(eq(appointments.scheduledDate, new Date(date)));
      if (startDate)
        conditions.push(gte(appointments.scheduledDate, new Date(startDate)));
      if (endDate)
        conditions.push(lte(appointments.scheduledDate, new Date(endDate)));

      const whereClause = and(...conditions);

      const [rows, countResult] = await Promise.all([
        db
          .select({
            appointment: appointments,
            patientName: patients.fullName,
            patientPhone: patients.phone,
            providerTitle: healthcareProviders.title,
            providerSpecialization: healthcareProviders.specialization,
          })
          .from(appointments)
          .leftJoin(
            patients,
            and(
              eq(patients.id, appointments.patientId),
              eq(patients.tenantId, ctx.tenantId)
            )
          )
          .leftJoin(
            healthcareProviders,
            and(
              eq(healthcareProviders.id, appointments.providerId),
              eq(healthcareProviders.tenantId, ctx.tenantId)
            )
          )
          .where(whereClause)
          .orderBy(
            asc(appointments.scheduledDate),
            asc(appointments.scheduledTime)
          )
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(appointments)
          .where(whereClause),
      ]);

      // انضمام واحد: اسم المريض ومزوّد الخدمة يأتيان من نفس الاستعلام
      // بدل استعلام منفصل لكل موعد (N+1).
      const enrichedAppointments = rows.map(row => ({
        ...row.appointment,
        patientName: row.patientName,
        patientPhone: row.patientPhone,
        providerTitle: row.providerTitle,
        providerSpecialization: row.providerSpecialization,
      }));

      return {
        appointments: enrichedAppointments,
        total: Number(countResult[0]?.count ?? 0),
        page,
        limit,
      };
    }),

  getAppointment: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return null;
      const db = await dbOrThrow();

      const apptResult = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, ctx.tenantId),
            eq(appointments.id, input.id)
          )
        )
        .limit(1);
      const appt = apptResult[0];
      if (!appt) return null;

      const patientResult = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.id, appt.patientId),
            eq(patients.tenantId, ctx.tenantId)
          )
        )
        .limit(1);
      const providerResult = await db
        .select()
        .from(healthcareProviders)
        .where(
          appt.providerId != null
            ? and(
                eq(healthcareProviders.id, appt.providerId),
                eq(healthcareProviders.tenantId, ctx.tenantId)
              )
            : sql`false`
        )
        .limit(1);

      return {
        ...appt,
        patient: patientResult[0],
        provider: providerResult[0],
      };
    }),

  createAppointment: tenantProcedure
    .use(requirePermissions(PERMISSIONS.HEALTHCARE_APPOINTMENTS_MANAGE))
    .input(appointmentSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();
      // Composite FK ownership: patient/provider/facility must share the tenant.
      const { assertRefsInTenant } = await import("./_core/tenantGuard");
      await assertRefsInTenant(db, ctx.tenantId, [
        { table: patients, id: input.patientId, label: "المريض" },
        {
          table: healthcareProviders,
          id: input.providerId,
          label: "مقدم الرعاية",
        },
        { table: healthcareFacilities, id: input.facilityId, label: "المنشأة" },
      ]);

      const seq = Math.floor(Math.random() * 999);
      const appointmentNumber = genNumber("APT", ctx.tenantId, seq);

      const appointmentData = {
        tenantId: ctx.tenantId,
        appointmentNumber,
        status: "scheduled" as const,
        createdById: ctx.user?.id ?? null,
        patientId: input.patientId,
        providerId: input.providerId,
        facilityId: input.facilityId,
        appointmentType: input.type,
        scheduledDate: new Date(input.scheduledDate),
        scheduledTime: input.scheduledTime,
        scheduledEndTime: input.scheduledEndTime,
        duration: input.duration,
        chiefComplaint: input.chiefComplaint,
        notes: input.notes,
        reason: input.reason,
        isFirstVisit: input.isFirstVisit ?? false,
        isTelemedicine: input.isTelemedicine ?? false,
        consultationFee: input.consultationFee
          ? String(input.consultationFee)
          : null,
      };
      const [appointment] = await db
        .insert(appointments)
        .values(appointmentData)
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.appointment.create",
        severity: "info",
        outcome: "success",
        resource: "appointments",
        resourceId: appointment.id?.toString(),
        details: { appointmentNumber, patientId: input.patientId },
      });

      return appointment;
    }),

  updateAppointmentStatus: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "scheduled",
          "confirmed",
          "checked_in",
          "in_progress",
          "completed",
          "cancelled",
          "no_show",
          "rescheduled",
        ]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const updateData: any = { status: input.status, updatedAt: new Date() };

      if (input.status === "cancelled") {
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = ctx.user?.id;
        updateData.cancellationReason = input.reason;
      }
      if (input.status === "completed") {
        updateData.actualEndTime = new Date();
      }
      if (input.status === "checked_in") {
        updateData.actualStartTime = new Date();
      }

      const [appointment] = await db
        .update(appointments)
        .set(updateData)
        .where(
          and(
            eq(appointments.tenantId, ctx.tenantId),
            eq(appointments.id, input.id)
          )
        )
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.appointment.status_update",
        severity: "info",
        outcome: "success",
        resource: "appointments",
        resourceId: appointment.id?.toString(),
        details: { status: input.status, reason: input.reason },
      });

      return appointment;
    }),

  getTodayAppointments: tenantProcedure
    .input(
      z.object({
        providerId: z.number().optional(),
        facilityId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return { appointments: [], statusCounts: {} };
      const db = await dbOrThrow();

      const today = new Date().toISOString().split("T")[0];
      const conditions: any[] = [
        eq(appointments.tenantId, ctx.tenantId),
        eq(appointments.scheduledDate, new Date(today)),
      ];
      if (input.providerId)
        conditions.push(eq(appointments.providerId, input.providerId));
      if (input.facilityId)
        conditions.push(eq(appointments.facilityId, input.facilityId));

      const appts = await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(asc(appointments.scheduledTime));

      const statusCounts: Record<string, number> = appts.reduce(
        (acc, appt) => {
          acc[appt.status] = (acc[appt.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return { appointments: appts, statusCounts };
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MEDICAL RECORDS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  listMedicalRecords: tenantProcedure
    .input(
      z.object({
        patientId: z.number(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return { records: [], total: 0 };
      const db = await dbOrThrow();

      const { patientId, page, limit } = input;
      const offset = (page - 1) * limit;

      const whereClause = and(
        eq(medicalRecords.tenantId, ctx.tenantId),
        eq(medicalRecords.patientId, patientId)
      );

      const [records, countResult] = await Promise.all([
        db
          .select()
          .from(medicalRecords)
          .where(whereClause)
          .orderBy(desc(medicalRecords.visitDate))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(medicalRecords)
          .where(whereClause),
      ]);

      return {
        records,
        total: Number(countResult[0]?.count ?? 0),
        page,
        limit,
      };
    }),

  getMedicalRecord: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return null;
      const db = await dbOrThrow();

      const recordResult = await db
        .select()
        .from(medicalRecords)
        .where(
          and(
            eq(medicalRecords.tenantId, ctx.tenantId),
            eq(medicalRecords.id, input.id)
          )
        )
        .limit(1);
      const record = recordResult[0];
      if (!record) return null;

      const entries = await db
        .select()
        .from(medicalRecordEntries)
        .where(eq(medicalRecordEntries.recordId, record.id))
        .orderBy(asc(medicalRecordEntries.createdAt));

      const vitals = await db
        .select()
        .from(vitalSignRecords)
        .where(eq(vitalSignRecords.recordId, record.id))
        .orderBy(desc(vitalSignRecords.recordedAt))
        .limit(1);

      return { ...record, entries, latestVitals: vitals[0] };
    }),

  createMedicalRecord: tenantProcedure
    .input(medicalRecordSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const seq = Math.floor(Math.random() * 999);
      const recordNumber = genNumber("MR", ctx.tenantId, seq);

      const recordData = {
        tenantId: ctx.tenantId,
        recordNumber,
        createdBy: ctx.user?.id ?? null,
        patientId: input.patientId,
        appointmentId: input.appointmentId ?? null,
        visitType: input.visitType,
        providerId: input.providerId,
        facilityId: input.facilityId,
        visitDate: input.visitDate,
        admissionDate: input.admissionDate
          ? new Date(input.admissionDate)
          : null,
        chiefComplaint: input.chiefComplaint ?? null,
        historyOfPresentIllness: input.historyOfPresentIllness ?? null,
        physicalExamination: input.physicalExamination ?? null,
        assessment: input.assessment ?? null,
        plan: input.plan ?? null,
      };
      const [record] = await db
        .insert(medicalRecords)
        .values(recordData as any)
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.record.create",
        severity: "info",
        outcome: "success",
        resource: "medical_records",
        resourceId: record.id?.toString(),
        details: { recordNumber, patientId: input.patientId },
      });

      return record;
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // DIAGNOSES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  addDiagnosis: tenantProcedure
    .input(diagnosisSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const entryData = {
        tenantId: ctx.tenantId,
        entryType: "diagnosis" as const,
        createdBy: ctx.user?.id ?? null,
        recordId: input.recordId,
        patientId: input.patientId,
        diagnosisType: input.diagnosisType,
        icdCode: input.icdCode,
        icdCodeSystem: input.icdCodeSystem,
        diagnosisDescription: input.diagnosisDescription,
        description: input.diagnosisDescription,
        isConfirmed: input.isConfirmed ?? true,
        severity: input.severity,
        notes: input.notes,
      };
      const [entry] = await db
        .insert(medicalRecordEntries)
        .values(entryData as any)
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.diagnosis.add",
        severity: "info",
        outcome: "success",
        resource: "medical_record_entries",
        resourceId: entry.id?.toString(),
        details: { icdCode: input.icdCode },
      });

      return entry;
    }),

  listDiagnosesByPatient: tenantProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();

      return db
        .select()
        .from(medicalRecordEntries)
        .where(
          and(
            eq(medicalRecordEntries.tenantId, ctx.tenantId),
            eq(medicalRecordEntries.patientId, input.patientId),
            eq(medicalRecordEntries.entryType, "diagnosis")
          )
        )
        .orderBy(desc(medicalRecordEntries.createdAt));
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // VITAL SIGNS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  recordVitalSigns: tenantProcedure
    .input(vitalSignsSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      let bmi = input.bmi;
      if (!bmi && input.weight && input.height) {
        const heightM = input.height / 100;
        bmi = Math.round((input.weight / (heightM * heightM)) * 100) / 100;
      }

      const abnormalFlags: string[] = [];
      if (
        input.bloodPressureSystolic &&
        (input.bloodPressureSystolic > 140 || input.bloodPressureSystolic < 90)
      ) {
        abnormalFlags.push("BP_ABNORMAL");
      }
      if (input.heartRate && (input.heartRate > 100 || input.heartRate < 60)) {
        abnormalFlags.push("HR_ABNORMAL");
      }
      if (input.oxygenSaturation && input.oxygenSaturation < 95) {
        abnormalFlags.push("SPO2_LOW");
      }
      if (
        input.temperature &&
        (input.temperature > 37.5 || input.temperature < 36.1)
      ) {
        abnormalFlags.push("TEMP_ABNORMAL");
      }

      const insertValues: any = {
        tenantId: ctx.tenantId,
        recordedBy: ctx.user?.id ?? null,
        recordedAt: new Date(),
        isAbnormal: abnormalFlags.length > 0,
        abnormalFlags,
        patientId: input.patientId,
      };
      if (input.recordId !== undefined) insertValues.recordId = input.recordId;
      if (input.appointmentId !== undefined)
        insertValues.appointmentId = input.appointmentId;
      if (input.temperature !== undefined)
        insertValues.temperature = String(input.temperature);
      if (input.temperatureUnit !== undefined)
        insertValues.temperatureUnit = input.temperatureUnit;
      if (input.heartRate !== undefined)
        insertValues.heartRate = input.heartRate;
      if (input.respiratoryRate !== undefined)
        insertValues.respiratoryRate = input.respiratoryRate;
      if (input.bloodPressureSystolic !== undefined)
        insertValues.bloodPressureSystolic = input.bloodPressureSystolic;
      if (input.bloodPressureDiastolic !== undefined)
        insertValues.bloodPressureDiastolic = input.bloodPressureDiastolic;
      if (input.oxygenSaturation !== undefined)
        insertValues.oxygenSaturation = String(input.oxygenSaturation);
      if (input.weight !== undefined)
        insertValues.weight = String(input.weight);
      if (input.height !== undefined)
        insertValues.height = String(input.height);
      if (bmi !== undefined) insertValues.bmi = String(bmi);
      if (input.waistCircumference !== undefined)
        insertValues.waistCircumference = String(input.waistCircumference);
      if (input.painLevel !== undefined)
        insertValues.painLevel = input.painLevel;
      if (input.notes !== undefined) insertValues.notes = input.notes;

      const [vitalRecord] = await db
        .insert(vitalSignRecords)
        .values(insertValues)
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.vitals.record",
        severity: "info",
        outcome: "success",
        resource: "vital_sign_records",
        resourceId: vitalRecord.id?.toString(),
        details: { patientId: input.patientId, abnormalFlags },
      });

      return vitalRecord;
    }),

  getPatientVitalsHistory: tenantProcedure
    .input(z.object({ patientId: z.number(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();

      return db
        .select()
        .from(vitalSignRecords)
        .where(
          and(
            eq(vitalSignRecords.tenantId, ctx.tenantId),
            eq(vitalSignRecords.patientId, input.patientId)
          )
        )
        .orderBy(desc(vitalSignRecords.recordedAt))
        .limit(input.limit);
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CONSENTS (HIPAA)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  listPatientConsents: tenantProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await dbOrThrow();

      return db
        .select()
        .from(patientConsents)
        .where(
          and(
            eq(patientConsents.tenantId, ctx.tenantId),
            eq(patientConsents.patientId, input.patientId)
          )
        )
        .orderBy(desc(patientConsents.createdAt));
    }),

  recordConsent: tenantProcedure
    .use(requirePermissions(PERMISSIONS.HEALTHCARE_CONSENT_MANAGE))
    .input(consentSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant required");
      const db = await dbOrThrow();

      const [consent] = await db
        .insert(patientConsents)
        .values({
          tenantId: ctx.tenantId,
          grantedAt: input.isGranted ? new Date() : null,
          grantedBy: input.isGranted ? ctx.user?.id?.toString() : null,
          ...input,
        })
        .returning();

      await auditLog({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id?.toString(),
        action: "healthcare.consent.record",
        severity: "info",
        outcome: "success",
        resource: "patient_consents",
        resourceId: consent.id?.toString(),
        details: { consentType: input.consentType, isGranted: input.isGranted },
      });

      return consent;
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ICD CODES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  searchIcdCodes: tenantProcedure
    .input(
      z.object({
        query: z.string().min(2),
        system: z.enum(["ICD10", "ICD9", "ICPC2", "SNOMED_CT"]).optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const { query, system, limit } = input;
      const searchPattern = `%${query}%`;
      const conditions: any[] = [
        sql`(${icdCodes.description} ILIKE ${searchPattern} OR ${icdCodes.code} ILIKE ${searchPattern})`,
        eq(icdCodes.isActive, true),
      ];
      if (system) conditions.push(eq(icdCodes.system, system));

      return db
        .select()
        .from(icdCodes)
        .where(and(...conditions))
        .limit(limit);
    }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STATISTICS & ANALYTICS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  getDashboardStats: tenantProcedure
    .input(z.object({ facilityId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return null;
      const db = await dbOrThrow();

      const today = new Date().toISOString().split("T")[0];
      const conditions: any[] = [eq(appointments.tenantId, ctx.tenantId)];
      if (input.facilityId)
        conditions.push(eq(appointments.facilityId, input.facilityId));

      const todayAppts = await db
        .select()
        .from(appointments)
        .where(
          and(...conditions, eq(appointments.scheduledDate, new Date(today)))
        );

      const statusCounts: Record<string, number> = todayAppts.reduce(
        (acc, appt) => {
          acc[appt.status] = (acc[appt.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const patientStatsResult = await db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) FILTER (WHERE ${patients.isActive} = true)`,
          vip: sql<number>`count(*) FILTER (WHERE ${patients.isVIP} = true)`,
        })
        .from(patients)
        .where(eq(patients.tenantId, ctx.tenantId));
      const patientStats = patientStatsResult[0];

      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split("T")[0];

      const monthlyStatsResult = await db
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'completed')`,
          cancelled: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'cancelled')`,
          noShow: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'no_show')`,
        })
        .from(appointments)
        .where(
          and(
            ...conditions,
            gte(appointments.scheduledDate, new Date(monthStartStr))
          )
        );
      const monthlyStats = monthlyStatsResult[0];

      const providers = await db
        .select()
        .from(healthcareProviders)
        .where(
          and(
            eq(healthcareProviders.tenantId, ctx.tenantId),
            eq(healthcareProviders.isActive, true)
          )
        );

      return {
        today: {
          total: todayAppts.length,
          scheduled: statusCounts["scheduled"] || 0,
          checkedIn: statusCounts["checked_in"] || 0,
          inProgress: statusCounts["in_progress"] || 0,
          completed: statusCounts["completed"] || 0,
          cancelled: statusCounts["cancelled"] || 0,
          noShow: statusCounts["no_show"] || 0,
        },
        patients: patientStats,
        monthly: monthlyStats,
        activeProviders: providers.length,
      };
    }),
});
