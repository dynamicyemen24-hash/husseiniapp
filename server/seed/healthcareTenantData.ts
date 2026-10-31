// Healthcare Seed Data - Tenant Configuration
// Yemeni, Gulf, and International Healthcare Standards
// Reference: Yemeni Ministry of Health (MOH), Gulf Cooperation Council health standards, WHO ICD-10

export const HEALTHCARE_TENANT_CODE = "HUSSEINIYA_HEALTHCARE";
export const HEALTHCARE_TENANT_NAME = "مجمع الحسينية الطبي";
export const HEALTHCARE_TENANT_CURRENCY = "YER";

export type IcdCodeSystem = "ICD10" | "ICD9" | "ICPC2" | "SNOMED_CT";

export interface SeedIcdCode {
  code: string;
  system: IcdCodeSystem;
  description: string;
  descriptionAr: string;
  category: string;
  subCategory: string | null;
}

export interface SeedFacility {
  code: string;
  name: string;
  nameAr: string;
  type: string;
  specialty: string | null;
  department: string | null;
  floor: string | null;
  building: string | null;
  acceptsInsurance: boolean;
  insuranceProviders: string[];
  operatingHours: Record<string, string>;
  contactPhone: string;
  contactEmail: string;
  notes: string | null;
}

export interface SeedProvider {
  licenseNumber: string;
  specialization: string;
  title: string;
  qualifications: string[];
  yearsExperience: number;
  consultationFee: string;
  followUpFee: string;
  scheduleTemplate: Record<string, string>;
  facilityCode: string;
  fullName: string;
  fullNameAr: string;
  email: string;
  phone: string;
}

export interface SeedPatient {
  patientNumber: string;
  firstName: string;
  lastName: string;
  localFirstName?: string;
  localLastName?: string;
  gender: "male" | "female";
  dateOfBirth: string;
  age: number;
  bloodType?: string;
  nationality: string;
  nationalId?: string;
  passportNumber?: string;
  maritalStatus?: string;
  occupation?: string;
  email?: string;
  phone: string;
  mobile?: string;
  address: string;
  city: string;
  region: string;
  country: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceCardNumber?: string;
  insuranceExpiry?: string;
  coPaymentPercent?: string;
  allergies?: any[];
  chronicConditions?: any[];
  medications?: any[];
  familyHistory?: string;
  isVIP?: boolean;
}
