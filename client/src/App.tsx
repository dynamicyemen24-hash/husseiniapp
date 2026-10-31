import React, { lazy, Suspense, type ComponentType } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { ErrorBoundary } from "@/components/ui/errorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OfflineProvider } from "./lib/offline/OfflineContext";
import { FloatingSupportWidget } from "@/components/FloatingSupportWidget";
import { AliasAIAssistant } from "@/components/AliasAIAssistant";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CommandPalette } from "@/components/CommandPalette";
import { SWUpdateToast } from "@/components/SWUpdateToast";
import { ScrollManager } from "@/components/ScrollManager";
import { PageTitle } from "@/components/PageTitle";
import { OfflineBanner } from "@/components/OfflineBanner";
import { CookieConsent } from "@/components/CookieConsent";
import { RequireAuth } from "@/components/RequireAuth";
import { I18nProvider } from "@/lib/i18n";
import { useWebVitals } from "@/lib/use-web-vitals";
import { CircularProgress } from "@/components/ui/circular-progress";
import { LoadingProvider } from "@/lib/loading-context";
import { GlobalQuickActions } from "@/components/GlobalQuickActions";
import { WishlistProvider } from "@/lib/wishlist";
import { MarketingLayout } from "@/layouts/MarketingLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { injectDesignTokens } from "@/lib/design";
import { useEffect } from "react";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const WorkspaceDashboard = lazy(() => import("@/pages/WorkspaceDashboard"));
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Portal = lazy(() => import("@/pages/Portal"));
const Download = lazy(() => import("@/pages/Download"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Contact = lazy(() => import("@/pages/Contact"));
const KnowledgeHub = lazy(() => import("@/pages/KnowledgeHub"));
const InteractiveCalculators = lazy(
  () => import("@/pages/InteractiveCalculators")
);
const TechSolutions = lazy(() => import("@/pages/TechSolutions"));
const ProjectGovernance = lazy(() => import("@/pages/ProjectGovernance"));
const Commercial = lazy(() => import("@/pages/Commercial"));
const Reports = lazy(() => import("@/pages/Reports"));
const Store = lazy(() => import("@/pages/Store"));
const Settings = lazy(() => import("@/pages/Settings"));
const Integrate = lazy(() => import("@/pages/Integrate"));
const ErpPage = lazy(() => import("@/pages/ErpPage"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Security = lazy(() => import("@/pages/Security"));
const Procurement = lazy(() => import("@/pages/Procurement"));
const PurchaseOrders = lazy(() => import("@/pages/PurchaseOrders"));
const GoodsReceipts = lazy(() => import("@/pages/GoodsReceipts"));
const ProcurementWorkspace = lazy(() => import("@/pages/ProcurementWorkspace"));
const SupplierAnalytics = lazy(() => import("@/pages/SupplierAnalytics"));
const Projects = lazy(() => import("@/pages/Projects"));
const HRPage = lazy(() => import("@/pages/HR"));
const SupportQuality = lazy(() => import("@/pages/SupportQuality"));
const POSPage = lazy(() => import("@/modules/pos/POSPage"));
const Permissions = lazy(() => import("@/pages/Permissions"));
const BasicData = lazy(() => import("@/pages/BasicData"));
const Journal = lazy(() => import("@/pages/Journal"));
const ManualJournal = lazy(() => import("@/pages/ManualJournal"));
const Customization = lazy(() => import("@/pages/Customization"));
const Branches = lazy(() => import("@/pages/Branches"));
const Audit = lazy(() => import("@/pages/Audit"));
const Requisitions = lazy(() => import("@/pages/Requisitions"));
const Operations = lazy(() => import("@/pages/Operations"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Billing = lazy(() => import("@/pages/Billing"));
const SubscriberOnboarding = lazy(() => import("@/pages/SubscriberOnboarding"));
const ClaimSubscription = lazy(() => import("@/pages/ClaimSubscription"));
const CostCenters = lazy(() => import("@/pages/CostCenters"));
const SmartRequisitions = lazy(() => import("@/pages/SmartRequisitions"));
const SmartBasicData = lazy(() => import("@/pages/SmartBasicData"));

const ZatcaIntegration = lazy(() => import("@/pages/ZatcaIntegration"));
const Beneficiaries = lazy(() => import("@/pages/Beneficiaries"));
const FinancialStatements = lazy(() => import("@/pages/FinancialStatements"));
const Statements = lazy(() => import("@/pages/Statements"));
const FiscalPeriods = lazy(() => import("@/pages/FiscalPeriods"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));

type RouteDef = { path: string; page: ComponentType };

const MARKETING_ROUTES: RouteDef[] = [
  { path: "/", page: Landing },
  { path: "/about", page: About },
  { path: "/portal", page: Portal },
  { path: "/download", page: Download },
  { path: "/pricing", page: Pricing },
  { path: "/contact", page: Contact },
  { path: "/insights", page: KnowledgeHub },
  { path: "/tools", page: InteractiveCalculators },
  { path: "/solutions", page: TechSolutions },
  { path: "/governance", page: ProjectGovernance },
  { path: "/integrate", page: Integrate },
  { path: "/privacy-policy", page: PrivacyPolicy },
  { path: "/terms-of-service", page: TermsOfService },
];

const GUEST_ROUTES: RouteDef[] = [
  { path: "/login", page: Login },
  { path: "/claim", page: ClaimSubscription },
  { path: "/reset-password", page: ResetPassword },
  { path: "/verify-email", page: VerifyEmail },
];

const APP_ROUTES: RouteDef[] = [
  { path: "/app", page: WorkspaceDashboard },
  { path: "/accounting", page: Home },
  { path: "/commercial", page: Commercial },
  { path: "/reports", page: Reports },
  { path: "/settings", page: Settings },
  { path: "/erp", page: ErpPage },
  { path: "/inventory", page: Inventory },
  { path: "/store", page: Store },
  { path: "/security", page: Security },
  { path: "/procurement-workspace", page: ProcurementWorkspace },
  { path: "/supplier-analytics", page: SupplierAnalytics },
  { path: "/procurement", page: Procurement },
  { path: "/purchase-orders", page: PurchaseOrders },
  { path: "/goods-receipts", page: GoodsReceipts },
  { path: "/projects", page: Projects },
  { path: "/hr", page: HRPage },
  { path: "/support", page: SupportQuality },
  { path: "/pos", page: POSPage },
  { path: "/permissions", page: Permissions },
  { path: "/basic-data", page: BasicData },
  { path: "/journal", page: Journal },
  { path: "/manual-journal", page: ManualJournal },
  { path: "/customization", page: Customization },
  { path: "/branches", page: Branches },
  { path: "/audit", page: Audit },
  { path: "/requisitions", page: Requisitions },
  { path: "/operations", page: Operations },
  { path: "/analytics", page: Analytics },
  { path: "/billing", page: Billing },
  { path: "/onboarding", page: SubscriberOnboarding },
  { path: "/cost-centers", page: CostCenters },
  { path: "/smart-requisitions", page: SmartRequisitions },
  { path: "/smart-data", page: SmartBasicData },
  { path: "/zatca", page: ZatcaIntegration },
  { path: "/beneficiaries", page: Beneficiaries },
  { path: "/financial-statements", page: FinancialStatements },
  { path: "/statements", page: Statements },
  { path: "/fiscal-periods", page: FiscalPeriods },
];

function Router() {
  return (
    <>
      <PageTitle />
      <ScrollManager />

      <div id="main-content" tabIndex={-1} className="focus:outline-none">
        <Switch>
          {MARKETING_ROUTES.map(({ path, page: Page }) => (
            <Route key={path} path={path}>
              <MarketingLayout>
                <Page />
              </MarketingLayout>
            </Route>
          ))}
          {GUEST_ROUTES.map(({ path, page: Page }) => (
            <Route key={path} path={path}>
              <Page />
            </Route>
          ))}
          {APP_ROUTES.map(({ path, page: Page }) => (
            <Route key={path} path={path}>
              <RequireAuth>
                <AppLayout>
                  <Page />
                </AppLayout>
              </RequireAuth>
            </Route>
          ))}
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

function App() {
  // Collect Core Web Vitals (CLS, INP, LCP) for real-user monitoring.
  useWebVitals({ reportOnce: true });

  // Inject design tokens as CSS custom properties.
  React.useEffect(() => {
    injectDesignTokens();
  }, []);

  return (
    <I18nProvider>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="light" switchable>
          <WishlistProvider>
            <OfflineProvider>
              <OfflineBanner />
              <CookieConsent />
              <TooltipProvider>
                <Toaster />
                <Router />
                <CommandPalette />
                <GlobalQuickActions />
                <FloatingSupportWidget />
                <AliasAIAssistant />
                <InstallPrompt />
                <SWUpdateToast />
              </TooltipProvider>
            </OfflineProvider>
          </WishlistProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </I18nProvider>
  );
}

export default App;
