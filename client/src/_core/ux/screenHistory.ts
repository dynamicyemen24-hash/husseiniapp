/**
 * screenHistory.ts - deterministic, purely-functional navigation history.
 *
 * Tracks recent screens, shortcut jumps and per-group summaries for the
 * command palette / recent-screens surface. Every function here is pure:
 * inputs are never mutated, ordering is fully deterministic, and nothing in
 * this module touches the DOM, router or database - so it runs identically in
 * the node test sandbox, SSR and the browser.
 */

export type ScreenRef = {
  key: string;
  title: string;
  group: "ops" | "catalog" | "finance" | "reports" | string;
};

export const DEFAULT_HISTORY_LIMIT = 12;

/**
 * Records a visit: most-recent first, deduped by key (moved to front) and
 * capped at `maxLen` entries (default `DEFAULT_HISTORY_LIMIT`). Returns a new
 * array; the input is never mutated.
 */
export function recordVisit(
  history: ScreenRef[],
  screen: ScreenRef,
  maxLen?: number
): ScreenRef[] {
  const cap = Math.max(0, Math.trunc(maxLen ?? DEFAULT_HISTORY_LIMIT));
  if (cap === 0) return [];
  const rest = history.filter(entry => entry.key !== screen.key);
  return [screen, ...rest].slice(0, cap);
}

/**
 * Returns a copy of the history in the same order. No mutation.
 */
export function recentScreens(history: ScreenRef[]): ScreenRef[] {
  return history.slice();
}

/**
 * Moves the first entry whose key matches `targetKey` to the front of a NEW
 * array. When the key is absent the history is returned unchanged (a copy)
 * with `promoted` set to false.
 */
export function shortcutJump(
  history: ScreenRef[],
  targetKey: string
): { history: ScreenRef[]; promoted: boolean } {
  const index = history.findIndex(entry => entry.key === targetKey);
  if (index === -1) {
    return { history: history.slice(), promoted: false };
  }
  const target = history[index];
  const rest = history.filter((_, i) => i !== index);
  return { history: [target, ...rest], promoted: true };
}

const GROUP_RANK: Record<string, number> = {
  ops: 0,
  catalog: 1,
  finance: 2,
  reports: 3,
};

function groupRank(group: string): number {
  const rank = GROUP_RANK[group];
  return rank === undefined ? 4 : rank;
}

/**
 * Aggregates the history into per-group counts. Ordering is deterministic:
 * ops, catalog, finance, reports, then any remaining groups alphabetically
 * (code-unit order). Only groups present in the history are listed.
 */
export function groupSummaries(
  history: ScreenRef[]
): Array<{ group: string; count: number }> {
  const counts = new Map<string, number>();
  for (const entry of history) {
    counts.set(entry.group, (counts.get(entry.group) ?? 0) + 1);
  }
  const groups = Array.from(counts.keys()).sort((a, b) => {
    const ra = groupRank(a);
    const rb = groupRank(b);
    if (ra !== rb) return ra - rb;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return groups.map(group => ({
    group,
    count: counts.get(group) ?? 0,
  }));
}

export type ScreenFlow = {
  key: string;
  steps: ScreenRef[];
};

const FLOW_TABLE: ScreenFlow[] = [
  {
    key: "advanceTrialBalance",
    steps: [
      { key: "voyage-list", title: "Voyages", group: "ops" },
      { key: "voyage-position", title: "Voyage Position", group: "ops" },
      { key: "trial-balance", title: "Trial Balance", group: "finance" },
      { key: "closing-report", title: "Closing Report", group: "reports" },
    ],
  },
  {
    key: "procurementRequest",
    steps: [
      { key: "catalog-search", title: "Catalog Search", group: "catalog" },
      { key: "request-draft", title: "Request Draft", group: "catalog" },
      { key: "approval", title: "Approval", group: "ops" },
    ],
  },
];

/**
 * Returns the screen at `step` for a known internal workflow, or null when
 * the flow is unknown or the step index is out of range.
 */
export function nextScreenFor(flow: string, step: number): ScreenRef | null {
  const item = FLOW_TABLE.find(entry => entry.key === flow);
  if (!item) return null;
  if (step < 0 || step >= item.steps.length) return null;
  return item.steps[step];
}
