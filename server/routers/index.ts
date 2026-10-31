import { router } from "../_core/trpc";
import { authRouter } from "./auth/authRouter";
import { financialRouter } from "./financial/financialRouter";
import { inventoryRouter } from "./inventory/inventoryRouter";
import { procurementRouter } from "./procurement/procurementRouter";
import { salesRouter } from "./sales/salesRouter";
import { hrRouter } from "./hr/hrRouter";
import { analyticsRouter } from "./analytics/analyticsRouter";
import { systemRouter } from "./system/systemRouter";
import { modulesRouter } from "../modulesRouter";
import { erpRouter } from "../erpRouter";
import { queryRouter } from "../queryRouter";
import { aliasAiRouter } from "../aliasAiRouter";
import { backupRouter } from "../backupRouter";
import { billingRouter } from "../billingRouter";
import { costCentersRouter } from "../costCentersRouter";
import { beneficiariesRouter } from "../beneficiariesRouter";
import { projectsRouter } from "../projectsRouter";
import { posRouter } from "../posRouter";
import { financialReportsRouter } from "../financialReportsRouter";
import { fiscalPeriodsRouter } from "../fiscalPeriodsRouter";
import { salesReportsRouter } from "../salesReportsRouter";
import { purchasesReportsRouter } from "../purchasesReportsRouter";
import { distributionReportsRouter } from "../distributionReportsRouter";
import { customerServiceReportsRouter } from "../customerServiceReportsRouter";
import { openingBalancesRouter } from "../accountingClosingRouter";
import { fiscalPeriodClosingRouter } from "../accountingClosingRouter";
import { accountingReportsRouter } from "../accountingClosingRouter";
import { inventoryReportsRouter } from "../accountingClosingRouter";
import { pharmacyRouter } from "../pharmacyRouter";
import { quotationRouter } from "../quotationRouter";
import { vouchersRouter } from "../vouchersRouter";
import { healthcareRouter } from "../healthcareRouter";
import { securityRouter } from "../securityRouter";
import { documentTemplateRouter } from "../documentTemplateRouter";
import { communicationRouter } from "../communicationRouter";
import { debtReportsRouter } from "../debtReportsRouter";
import { invoiceEnhancementsRouter } from "../invoiceEnhancementsRouter";
import { procurementReportsRouter } from "../procurementReportsRouter";
import { posIntelligenceRouter } from "../posIntelligenceRouter";
import { smartRouter } from "../smartRouter";
import { auditRouter } from "../routers/auditRouter";
import { workflowRouter } from "../routers/workflowRouter";
import { documentsRouter } from "../documentsRouter";
import { partnerAccountingRouter } from "../partnerAccountingRouter";
import { managerialAccountingRouter } from "../managerialAccountingRouter";
import { advancedCostAccountingRouter } from "../advancedCostAccountingRouter";
import { productionAccountingRouter } from "../productionAccountingRouter";
import { eliasProRouter } from "../eliasPro/router";

export const appRouter = router({
  auth: authRouter,
  financial: financialRouter,
  inventory: inventoryRouter,
  procurement: procurementRouter,
  sales: salesRouter,
  hr: hrRouter,
  analytics: analyticsRouter,
  system: systemRouter,
  modules: modulesRouter,
  erp: erpRouter,
  query: queryRouter,
  aliasAi: aliasAiRouter,
  backup: backupRouter,
  billing: billingRouter,
  costCenters: costCentersRouter,
  beneficiaries: beneficiariesRouter,
  projects: projectsRouter,
  pos: posRouter,
  financialReports: financialReportsRouter,
  fiscalPeriods: fiscalPeriodsRouter,
  salesReports: salesReportsRouter,
  purchasesReports: purchasesReportsRouter,
  distributionReports: distributionReportsRouter,
  customerServiceReports: customerServiceReportsRouter,
  openingBalances: openingBalancesRouter,
  fiscalPeriodClosing: fiscalPeriodClosingRouter,
  accountingReports: accountingReportsRouter,
  inventoryReports: inventoryReportsRouter,
  pharmacy: pharmacyRouter,
  quotation: quotationRouter,
  vouchers: vouchersRouter,
  healthcare: healthcareRouter,
  security: securityRouter,
  documentTemplate: documentTemplateRouter,
  communication: communicationRouter,
  debtReports: debtReportsRouter,
  invoiceEnhancements: invoiceEnhancementsRouter,
  procurementReports: procurementReportsRouter,
  posIntelligence: posIntelligenceRouter,
  smart: smartRouter,
  audit: auditRouter,
  workflow: workflowRouter,
  documents: documentsRouter,
  partnerAccounting: partnerAccountingRouter,
  managerialAccounting: managerialAccountingRouter,
  advancedCostAccounting: advancedCostAccountingRouter,
  productionAccounting: productionAccountingRouter,
  eliasPro: eliasProRouter,
});

export type AppRouter = typeof appRouter;

export { provisionGenericTenant } from "../_core/systemRouter";
export { seedDefaultAccountsForTenant, defaultCityForCountry } from "../routers";