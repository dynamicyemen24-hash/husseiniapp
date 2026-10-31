import React, { lazy, Suspense, type ComponentType } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { ErrorBoundary } from "@/components/ui/errorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OfflineProvider } from "./lib/offline/OfflineContext";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SWUpdateToast } from "@/components/SWUpdateToast";
import { ScrollManager } from "@/components/ScrollManager";
import { PageTitle } from "@/components/PageTitle";
import { OfflineBanner } from "@/components/OfflineBanner";
import { CookieConsent } from "@/components/CookieConsent";
import { MarketingLayout } from "@/layouts/MarketingLayout";
import { injectDesignTokens } from "@/lib/design";
import { useEffect } from "react";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
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
const Integrate = lazy(() => import("@/pages/Integrate"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ClaimSubscription = lazy(() => import("@/pages/ClaimSubscription"));

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
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

function AppMarketing() {
  useEffect(() => {
    injectDesignTokens();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <OfflineProvider>
          <OfflineBanner />
          <CookieConsent />
          <TooltipProvider>
            <Toaster />
            <Router />
            <InstallPrompt />
            <SWUpdateToast />
          </TooltipProvider>
        </OfflineProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default AppMarketing;
