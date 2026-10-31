/**
 * Connectivity is handled silently by OfflineProvider and the sync manager.
 * The shell must stay calm: a temporary network state is not a page-level
 * error and should never push the header or interrupt the user's work.
 */
export function OfflineBanner() {
  return null;
}
