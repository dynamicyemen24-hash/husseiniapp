/**
 * Pharmacy Clinical Calculations Engine — Type Definitions
 * World-class clinical dosing and patient safety calculations.
 * IFIP, FDA, WHO, CPOE standards compliant.
 * Multi-tenant compatible, Arabic (RTL) supportive.
 */

/** Patient demographic and factor data for dosing calculations */
export interface PatientFactors {
  /** Patient age in years */
  age: number;
  /** Patient weight in kilograms */
  weightKg: number;
  /** Patient height in centimeters (for BMI) */
  heightCm?: number;
  /** Sex assigned at birth */
  sex: "male" | "female";
  /** Creatinine clearance mL/min ( Cockcroft-Gault ) */
  crClMlMin?: number;
  /** eGFR mL/min/1.73m2 */
  egfrMlMin?: number;
  /** Child-Pugh score for hepatic function */
  childPughScore?: 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
  /** Albumin g/dL */
  albuminGdl?: number;
  /** Total bilirubin mg/dL */
  bilirubinMgdl?: number;
  /** INR */
  inr?: number;
}

/** Result of weight-based dosing calculation */
export interface WeightBasedDose {
  /** Calculated dose */
  dose: number;
  /** Dose unit */
  unit: string;
  /** Dose per kg */
  dosePerKg: number;
  /** Dose per ideal body weight */
  dosePerIdealBodyKg: number;
  /** Lean body weight in kg */
  leanBodyKg: number;
  /** Ideal body weight in kg */
  idealBodyKg: number;
  /** Adjusted body weight if applicable */
  adjustedBodyKg?: number;
  /** Maximum allowable dose */
  maxDose: number;
  /** Minimum allowable dose */
  minDose: number;
  /** Dosing interval in hours */
  dosingIntervalHrs: number;
  /** Flags */
  flags: DoseFlags;
  /** Notes/observations */
  notes?: string;
}

/** Dosing calculation flags */
export interface DoseFlags {
  /** Dose exceeded maximum recommended */
  exceededMax: boolean;
  /** Dose below minimum recommended */
  belowMin: boolean;
  /** Requires renal adjustment */
  requiresRenalAdjustment: boolean;
  /** Requires hepatic adjustment */
  requiresHepaticAdjustment: boolean;
  /** Pediatric dosing required */
  isPediatric: boolean;
  /** Weight significant deviation from ideal */
  weightDeviationSignificant: boolean;
  /** Dose rounded to available strength */
  roundedToAvailableStrength: boolean;
}

/** Drug entity for therapeutic duplication detection */
export interface DrugEntity {
  /** Drug ID or code */
  drugId: string;
  /** Drug name */
  drugName: string;
  /** ATC code */
  atcCode?: string;
  /** Therapeutic class */
  therapeuticClass?: string;
  /** Daily dose prescribed */
  dailyDose?: number;
  /** Daily dose unit */
  dailyDoseUnit?: string;
  /** Frequency */
  frequency?: string;
  /** Route of administration */
  route?: string;
}

/** Therapeutic duplication detection result */
export interface TherapeuticDuplicationResult {
  /** Whether duplication was detected */
  duplicationDetected: boolean;
  /** Severity level */
  severity: "none" | "low" | "moderate" | "high" | "critical";
  /** Affected drugs */
  affectedDrugs: DrugEntity[];
  /** Description of the duplication */
  description: string;
  /** Recommended action */
  recommendedAction:
    | "continue"
    | "reduce"
    | "discontinue"
    | "consult-specialist";
  /** Confidence score */
  confidence: number;
}

/** Renal dose adjustment result */
export interface RenalDoseAdjustment {
  /** Original dose */
  originalDose: WeightBasedDose;
  /** Adjusted dose */
  adjustedDose: WeightBasedDose;
  /** Adjustment factor */
  adjustmentFactor: number;
  /** Adjustment rationale */
  rationale: string;
  /** Monitoring requirements */
  monitoring: string[];
}

/** Hepatic dose adjustment result */
export interface HepaticDoseAdjustment {
  /** Original dose */
  originalDose: WeightBasedDose;
  /** Adjusted dose */
  adjustedDose: WeightBasedDose;
  /** Adjustment category */
  adjustmentCategory:
    | "none"
    | "mild"
    | "moderate"
    | "severe"
    | "contraindicated";
  /** Adjustment rationale */
  rationale: string;
  /** Monitoring requirements */
  monitoring: string[];
}

/** Pediatric dosing result */
export interface PediatricDosing {
  /** Age category */
  ageCategory: "neonate" | "infant" | "child" | "adolescent";
  /** Weight-based dose */
  weightBasedDose: WeightBasedDose;
  /** BSA-based dose (if height available) */
  bsADose?: WeightBasedDose;
  /** Dosing interval */
  dosingInterval: string;
  /** Special considerations */
  considerations: string[];
  /** Safety check */
  safetyCheck: "pass" | "warn" | "contraindicated";
}

/** Drug interaction severity */
export type InteractionSeverity =
  | "minimal"
  | "moderate"
  | "major"
  | "contraindicated";

/** Drug interaction result */
export interface DrugInteractionResult {
  /** interacting drug 1 */
  drug1: DrugEntity;
  /** interacting drug 2 */
  drug2: DrugEntity;
  /** Severity */
  severity: InteractionSeverity;
  /** Mechanism of interaction */
  mechanism: string;
  /** Clinical significance */
  clinicalSignificance: string;
  /** Management recommendation */
  management: "monitor" | "adjust-doses" | "avoid-combination" | "consult";
}

/** Medication administration record calculation */
export interface MedicationAdministrationCalc {
  /** Drug to administer */
  drug: DrugEntity;
  /** Calculated dose */
  calculatedDose: WeightBasedDose;
  /** Diluent volume if needed */
  diluentVolume?: number;
  /** Final concentration */
  finalConcentration?: number;
  /** infusion rate if applicable */
  infusionRate?: number;
  /** Administration time */
  administrationTime: string;
  /** Safety checks */
  safetyChecks: SafetyCheck[];
}

/** Safety check for medication administration */
export interface SafetyCheck {
  /** Check type */
  type:
    | "renal-function"
    | "hepatic-function"
    | "weight-verify"
    | "allergies"
    | "duplication"
    | "max-dose";
  /** Check result */
  passed: boolean;
  /** Message */
  message: string;
}

/** Prescription safety assessment */
export interface PrescriptionSafetyAssessment {
  /** Prescription ID */
  prescriptionId: string;
  /** Patient factors */
  patientFactors: PatientFactors;
  /** Weight-based dose calculations */
  doseCalculations: WeightBasedDose[];
  /** Therapeutic duplication check */
  therapeuticDuplication: TherapeuticDuplicationResult;
  /** Drug interaction check (if multiple drugs) */
  drugInteractions: DrugInteractionResult[];
  /** Renal adjustment needed */
  renalAdjustment: RenalDoseAdjustment | null;
  /** Hepatic adjustment needed */
  hepaticAdjustment: HepaticDoseAdjustment | null;
  /** Pediatric dosing */
  pediatricDosing: PediatricDosing | null;
  /** Overall safety status */
  overallStatus: "safe" | "caution" | "warning" | "contraindicated";
  /** Generated at */
  generatedAt: Date;
  /** Assessed by */
  assessedBy: string;
}
