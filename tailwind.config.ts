import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "#f7f8fa",
          100: "#eceff3",
          200: "#d7dce3",
          500: "#667085",
          700: "#344054",
          900: "#111827",
        },
        school: {
          50: "#effaf6",
          100: "#d8f2e7",
          200: "#aee3d0",
          500: "#0f8f6b",
          600: "#087a5b",
          700: "#075f49",
        },
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          700: "#b45309",
        },
      },
      boxShadow: {
        soft: "0 12px 28px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
