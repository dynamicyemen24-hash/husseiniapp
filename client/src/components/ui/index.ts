export { Glass, GlassCard, GlassBadge, GlassPanel } from "./glass";
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonProfile,
  SkeletonDashboard,
  Shimmer,
} from "./skeleton";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  HelpButton,
  SmartHelp,
  LoadingSpinner,
  StatusIndicator,
} from "./tooltip";
export {
  EmptyState,
  EmptyInvoices,
  EmptyRequisitions,
  EmptyCustomers,
  EmptyProducts,
  EmptySearch,
  EmptyError,
  EmptyWarehouse,
} from "./emptyState";
export { ErrorBoundary, InlineError } from "./errorBoundary";
export { EnhancedErrorBoundary } from "./enhancedErrorBoundary";
export {
  AnimatedPage,
  SmartLayout,
  StatCard,
  AnimatedCard,
  AnimatedGrid,
} from "./animatedPage";
export { StepIndicator, StepIndicatorCompact } from "./stepIndicator";
export {
  ActivityIndicator,
  TypingIndicator,
  PresenceList,
} from "./activityIndicator";
export { BadgeModern, AwardBadge } from "./badgeModern";
export { SmartInput, SmartSelect } from "./smartInput";
export { ChartCard, DashboardGrid, BentoCard } from "./chartCard";
export { InlineEdit, Pressable, ShineButton } from "./inlineEdit";

// ─── World-Class Mobile & Performance Components ────────────
export {
  MobileBottomNav,
  ResponsiveTable,
  SmartSearchBar,
} from "@/components/MobileBottomNav";
export {
  useVirtualScroll,
  useResponsive,
  useTouchGestures,
  useOptimisticUpdate,
  useDebouncedCallback,
  useDebouncedValue,
  usePerformanceObserver,
} from "@/lib/useVirtualScroll";
export {
  useProductSuggester,
  useReorderRecommender,
  useSmartDiscount,
  useAutoComplete,
  useQuantityPrediction,
  useContextSuggestions,
} from "@/lib/aiSuggestions";
export {
  OfflineMutationQueue,
  useOfflineQueue,
} from "@/lib/offline/mutationQueue";
export { Spinner, LoadingButton, StatusStrip } from "./loading";

// ─── World-Class Core Data Engine Components ────────────
// Data Engine
export { DataEngine } from "@/lib/dataEngine";
export type {
  DataField,
  DataOption,
  DataRecord,
  DataSchema,
  DataEngineConfig,
  AutoCompleteResult,
  ValidationResult,
  DataLineage,
} from "@/lib/dataEngine";
// Data Quality
export { DataQualityEngine, useDataQuality } from "@/lib/dataQuality";
export type {
  QualityIssue,
  DataQualityReport,
  ValidationRule,
} from "@/lib/dataQuality";
// Composability
export { ComposabilityEngine, useComposability } from "@/lib/composability";
export type {
  DataCard,
  DataFormComposition,
  Template,
  TemplateRule,
  FieldDependency,
  FormMergeResult,
} from "@/lib/composability";
// Auto-Completion
export {
  useAutoCompleteEngine,
  ServerAutoCompleteEngine,
  createAutoCompleteSource,
} from "@/lib/autoComplete";
export type {
  AutoCompleteEntry,
  AutoCompleteResult as ACResult,
  AutoCompleteConfig,
  AutoCompleteEngine as ACEngine,
} from "@/lib/autoComplete";
// Components
export { SmartDataForm } from "@/components/SmartDataForm";
export { DataField as DataFieldComponent } from "@/components/ui/dataField";
export type { DataFieldProps } from "@/components/ui/dataField";
// ─── Ultimate Enterprise Ecosystem & Master UI ────
export { EnterpriseEcosystemMaster } from "@/components/EnterpriseEcosystemMaster";
export type { EnterpriseEcosystemMasterProps } from "@/components/EnterpriseEcosystemMaster";
