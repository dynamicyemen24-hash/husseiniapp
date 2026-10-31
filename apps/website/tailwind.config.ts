import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui-primitives/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fef7ee",
          100: "#fdedd6",
          200: "#fad6ac",
          300: "#f6b875",
          400: "#f2923d",
          500: "#ed710e",
          600: "#de5a0c",
          700: "#b8430d",
          800: "#943611",
          900: "#7a2f11",
          950: "#421406",
        },
        secondary: {
          50: "#f5faf5",
          100: "#e8f5e8",
          200: "#d1ebd1",
          300: "#a8d6a8",
          400: "#75bb75",
          500: "#4caf50",
          600: "#3d8b3d",
          700: "#316e31",
          800: "#2a582a",
          900: "#244824",
          950: "#112811",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        arabic: [
          "var(--font-noto-arabic)",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
