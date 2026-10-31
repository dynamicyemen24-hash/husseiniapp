// Nearest-token resolver for leftover arbitrary hex classes
// Light theme (default "Heritage Ledger") values from client/src/index.css
const TOKENS = {
  "brand-50": "#faf4ec",
  "brand-100": "#f3e6d6",
  "brand-200": "#e7c9a6",
  "brand-300": "#d4a574",
  "brand-400": "#c08e52",
  brand: "#b87945",
  "brand-deep": "#9a6334",
  "brand-700": "#7a5228",
  "brand-800": "#5c3f1f",
  "brand-900": "#3f2c16",
  ink: "#0e2a2b",
  "ink-deep": "#0a1f20",
  "ink-500": "#2a4e50",
  "ink-600": "#1e3a3c",
  "ink-700": "#16393b",
  "ink-800": "#162e30",
  sand: "#fbf8f2",
  muted: "#f5f0e8",
  accent: "#eee6d6",
  border: "#e5dfd5",
  // Tailwind core (used for status/chart accents)
  "teal-500": "#14b8a6",
  "teal-600": "#0d9488",
  "teal-700": "#0f766e",
  "teal-800": "#115e59",
  "sky-300": "#7dd3fc",
  "sky-600": "#0284c7",
  "sky-700": "#0369a1",
  "sky-800": "#075985",
  "blue-600": "#2563eb",
  "violet-500": "#8b5cf6",
  "violet-600": "#7c3aed",
  "amber-400": "#fbbf24",
  "amber-500": "#f59e0b",
  "amber-700": "#b45309",
  "yellow-600": "#ca8a04",
  "green-600": "#16a34a",
  "emerald-500": "#10b981",
  "red-600": "#dc2626",
};

const hex = h => {
  const s = h.startsWith("#") ? h : `#${h}`;
  return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
};
const dist = (a, b) => {
  const [r1, g1, b1] = hex(a),
    [r2, g2, b2] = hex(b);
  // weighted RGB (perceived distance approximation)
  return Math.sqrt(
    2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2
  );
};

const targets = process.argv.slice(2);
for (const t of targets) {
  const ranked = Object.entries(TOKENS)
    .map(([name, v]) => ({ name, d: dist(t, v) }))
    .sort((a, b) => a.d - b.d);
  const [best, second] = ranked;
  console.log(
    `#${t} → ${best.name} (Δ${best.d.toFixed(1)}; next: ${second.name} Δ${second.d.toFixed(1)})`
  );
}
