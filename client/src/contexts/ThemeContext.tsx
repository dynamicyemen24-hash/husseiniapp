import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * ALHUSAINIA — Professional theme system (world-class visual identity).
 *
 * Each theme is a coherent, accessibility-checked preset defined in
 * `index.css` beneath `html[data-theme="…"]`. Every preset restates the full
 * token surface (background, brand scale, ink, borders…) so switching is
 * always complete — no half-dark UIs, no stale colors.
 *
 * Persistence: `alh-theme` in localStorage. First visit respects the OS
 * `prefers-color-scheme`. Dark-mode themes also toggle the `.dark` class so
 * Tailwind `dark:` variants stay coherent.
 */

export type ThemeId =
  | "light"
  | "dark"
  | "midnight"
  | "emerald"
  | "rose"
  | "ocean";
export type ThemeMode = "light" | "dark";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  mode: ThemeMode;
  /** Swatch color dots shown in the picker */
  swatch: string[];
  description: string;
  /** Semantic status palette */
  success?: string;
  warning?: string;
  info?: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "light",
    label: "الفجر التراثي",
    mode: "light",
    swatch: ["#fbf8f2", "#b87945", "#0e2a2b"],
    description: "الإرث الكلاسيكي — فاتح دافئ وهوّية الحسينية الأصلية",
    success: "#15803d",
    warning: "#b45309",
    info: "#1d6f8f",
  },
  {
    id: "dark",
    label: "الليل الكلاسيكي",
    mode: "dark",
    swatch: ["#0d1b1c", "#b87945", "#162e30"],
    description: "داكن هادئ قليل التوهّج مع البرونز الذهبي",
    success: "#4ade80",
    warning: "#fbbf24",
    info: "#38bdf8",
  },
  {
    id: "midnight",
    label: "الصفاء الليلي",
    mode: "dark",
    swatch: ["#0b1424", "#6c9dff", "#141f38"],
    description: "أزرق منتصف الليل — تركيز عميق وراحة بصرية",
    success: "#4ade80",
    warning: "#fbbf24",
    info: "#93c5fd",
  },
  {
    id: "emerald",
    label: "الياقوت التنفيذي",
    mode: "dark",
    swatch: ["#071a15", "#34d399", "#0f2b23"],
    description: "أخضر زمردي راقٍ للقيادات والأعمال",
    success: "#6ee7b7",
    warning: "#fcd34d",
    info: "#67e8f9",
  },
  {
    id: "rose",
    label: "الرقي الذهبي",
    mode: "light",
    swatch: ["#fdf6f3", "#c06b5a", "#3a2220"],
    description: "دافئ أنيق بنفحة نحاسية راقية",
    success: "#c2410c",
    warning: "#b45309",
    info: "#0369a1",
  },
  {
    id: "ocean",
    label: "النقاء الأزرق",
    mode: "light",
    swatch: ["#f2f7fa", "#1d6f8f", "#0b2c3a"],
    description: "أزرق نقي منعش يبعث الهدوء والوضوح",
    success: "#0d9488",
    warning: "#ca8a04",
    info: "#0284c7",
  },
];

const STORAGE_KEY = "alh-theme";
const IDS: string[] = THEMES.map(t => t.id);

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && IDS.includes(value);
}

function resolveInitial(defaultTheme: ThemeId, switchable: boolean): ThemeId {
  if (!switchable) return defaultTheme;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(stored)) return stored;
    // ليلاً افتراضياً — يقلل إجهاد المحاسب الليلي ويحقق WCAG AAA (تباين داكن)
    const hour = new Date().getHours();
    const isNight = hour >= 19 || hour < 6;
    if (isNight) return "dark";
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    /* localStorage unavailable */
  }
  return defaultTheme;
}

interface ThemeContextType {
  theme: ThemeId;
  meta: ThemeMeta;
  themes: ThemeMeta[];
  setTheme: (next: ThemeId) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeId;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = true,
}: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(() =>
    resolveInitial(defaultTheme, switchable)
  );

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", themeId);
    const meta = THEMES.find(t => t.id === themeId) ?? THEMES[0];
    root.classList.toggle("dark", meta.mode === "dark");
    // Keep the browser/PWA chrome in sync with the active surface color.
    const chrome =
      themeId === "rose"
        ? "#3a2220"
        : themeId === "ocean"
          ? "#0b2c3a"
          : themeId === "light"
            ? "#102a2b"
            : "#0a1f20";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", chrome);
    if (switchable) {
      try {
        localStorage.setItem(STORAGE_KEY, themeId);
      } catch {
        /* ignore */
      }
    }
  }, [themeId, switchable]);

  const meta = useMemo(
    () => THEMES.find(t => t.id === themeId) ?? THEMES[0],
    [themeId]
  );

  const setTheme = useMemo(() => (next: ThemeId) => setThemeId(next), []);

  const toggleTheme = useMemo(() => {
    if (!switchable) return undefined;
    return () =>
      setThemeId(prev => {
        const cur = THEMES.find(t => t.id === prev) ?? THEMES[0];
        // Flip between the light flagship and the dark flagship.
        return cur.mode === "dark" ? THEMES[0].id : THEMES[1].id;
      });
  }, [switchable]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: themeId,
      meta,
      themes: THEMES,
      setTheme,
      toggleTheme,
      switchable,
    }),
    [themeId, meta, setTheme, toggleTheme, switchable]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
