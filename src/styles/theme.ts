import { DefaultTheme } from "styled-components";
import { ThemeMode } from "@/context/ThemeModeContext";

interface ThemePalette {
  primary: string;
  primaryHover: string;
  secondary: string;
  background: string;
  backgroundAccent: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    light: string;
    white: string;
  };
  status: {
    success: string;
    warning: string;
    info: string;
    purple: string;
  };
  border: string;
  borderStrong: string;
  overlay: string;
  sidebar: {
    background: string;
    border: string;
    muted: string;
    icon: string;
    activeText: string;
  };
  column: {
    background: string;
    dragOver: string;
    dragBorder: string;
  };
}

const common = {
  breakpoints: {
    mobile: "640px",
    tablet: "800px",
    laptop: "1024px",
    desktop: "1200px"
  },
  borderRadius: {
    small: "8px",
    medium: "12px",
    large: "14px",
    pill: "999px"
  }
} satisfies Pick<DefaultTheme, "breakpoints" | "borderRadius">;

const lightColors: ThemePalette = {
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  secondary: "#181a1f",
  background: "#f3f7fb",
  backgroundAccent: "radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 42%)",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  surfaceElevated: "rgba(255, 255, 255, 0.88)",
  text: {
    primary: "#0f172a",
    secondary: "#475569",
    muted: "#64748b",
    light: "#b9c4d6",
    white: "#ffffff"
  },
  status: {
    success: "#16a34a",
    warning: "#ef4444",
    info: "#0ea5e9",
    purple: "#8b5cf6"
  },
  border: "rgba(148, 163, 184, 0.22)",
  borderStrong: "rgba(100, 116, 139, 0.4)",
  overlay: "rgba(15, 23, 42, 0.35)",
  sidebar: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 48%, #eef4ff 100%)",
    border: "rgba(148, 163, 184, 0.22)",
    muted: "#64748b",
    icon: "#2563eb",
    activeText: "#0f172a"
  },
  column: {
    background: "#e8eef7",
    dragOver: "#dbeafe",
    dragBorder: "#3b82f6"
  }
};

const darkColors: ThemePalette = {
  primary: "#60a5fa",
  primaryHover: "#93c5fd",
  secondary: "#0f172a",
  background: "#020617",
  backgroundAccent: "radial-gradient(circle at top, rgba(56, 189, 248, 0.14), transparent 38%)",
  surface: "#0f172a",
  surfaceAlt: "#111827",
  surfaceElevated: "rgba(15, 23, 42, 0.82)",
  text: {
    primary: "#f8fafc",
    secondary: "#cbd5e1",
    muted: "#94a3b8",
    light: "#94a3b8",
    white: "#ffffff"
  },
  status: {
    success: "#22c55e",
    warning: "#f87171",
    info: "#38bdf8",
    purple: "#a78bfa"
  },
  border: "rgba(148, 163, 184, 0.18)",
  borderStrong: "rgba(148, 163, 184, 0.32)",
  overlay: "rgba(2, 6, 23, 0.65)",
  sidebar: {
    background: "linear-gradient(180deg, #0f172a 0%, #111c34 55%, #13213f 100%)",
    border: "rgba(148, 163, 184, 0.18)",
    muted: "#94a3b8",
    icon: "#93c5fd",
    activeText: "#f8fafc"
  },
  column: {
    background: "#0b1220",
    dragOver: "#12243d",
    dragBorder: "#60a5fa"
  }
};

export function getTheme(mode: ThemeMode): DefaultTheme {
  const colors = mode === "dark" ? darkColors : lightColors;

  return {
    colors,
    breakpoints: common.breakpoints,
    shadows: {
      card:
        mode === "dark"
          ? "0 18px 40px rgba(2, 6, 23, 0.45)"
          : "0 12px 30px rgba(15, 23, 42, 0.08)",
      hover:
        mode === "dark"
          ? "0 22px 44px rgba(15, 23, 42, 0.52)"
          : "0 18px 36px rgba(37, 99, 235, 0.12)"
    },
    borderRadius: common.borderRadius
  };
}
