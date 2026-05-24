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
  },
  spacing: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem"
  },
  typography: {
    family: {
      body: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    },
    size: {
      xs: "0.75rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem"
    },
    weight: {
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    }
  },
  motion: {
    fast: "120ms",
    normal: "180ms",
    slow: "700ms",
    easing: "ease"
  },
  zIndex: {
    sidebar: 30,
    overlay: 80,
    toast: 100
  }
} satisfies Pick<DefaultTheme, "breakpoints" | "borderRadius" | "spacing" | "typography" | "motion" | "zIndex">;

function buildTokens(colors: ThemePalette, mode: ThemeMode): DefaultTheme["tokens"] {
  return {
    color: {
      bg: {
        default: colors.background,
        accent: colors.backgroundAccent,
        surface: colors.surface,
        surfaceAlt: colors.surfaceAlt,
        surfaceElevated: colors.surfaceElevated,
        overlay: colors.overlay
      },
      text: {
        primary: colors.text.primary,
        secondary: colors.text.secondary,
        muted: colors.text.muted,
        inverse: colors.text.white
      },
      border: {
        default: colors.border,
        strong: colors.borderStrong
      },
      interactive: {
        primary: colors.primary,
        primaryHover: colors.primaryHover,
        focus: colors.primary,
        ghostHover: mode === "dark" ? "rgba(148, 163, 184, 0.12)" : "rgba(37, 99, 235, 0.08)",
        pillGradients:
          mode === "dark"
            ? [
                "linear-gradient(135deg, #2563eb, #06b6d4)",
                "linear-gradient(135deg, #7c3aed, #2563eb)",
                "linear-gradient(135deg, #059669, #0ea5e9)",
                "linear-gradient(135deg, #be123c, #7c3aed)"
              ]
            : [
                "linear-gradient(135deg, #2563eb, #0ea5e9)",
                "linear-gradient(135deg, #7c3aed, #2563eb)",
                "linear-gradient(135deg, #16a34a, #0ea5e9)",
                "linear-gradient(135deg, #e11d48, #7c3aed)"
              ]
      },
      status: {
        success: colors.status.success,
        successSurface: mode === "dark" ? "rgba(34, 197, 94, 0.16)" : "rgba(22, 163, 74, 0.1)",
        successBorder: mode === "dark" ? "rgba(34, 197, 94, 0.36)" : "rgba(22, 163, 74, 0.24)",
        successText: mode === "dark" ? "#bbf7d0" : "#166534",
        warning: colors.status.warning,
        warningSurface: mode === "dark" ? "rgba(248, 113, 113, 0.16)" : "rgba(239, 68, 68, 0.1)",
        warningBorder: mode === "dark" ? "rgba(248, 113, 113, 0.38)" : "rgba(239, 68, 68, 0.24)",
        warningText: mode === "dark" ? "#fecaca" : "#991b1b",
        info: colors.status.info,
        infoSurface: mode === "dark" ? "rgba(56, 189, 248, 0.16)" : "rgba(14, 165, 233, 0.1)",
        infoBorder: mode === "dark" ? "rgba(56, 189, 248, 0.38)" : "rgba(14, 165, 233, 0.24)",
        infoText: mode === "dark" ? "#bae6fd" : "#075985"
      }
    }
  };
}

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
    mode,
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
    borderRadius: common.borderRadius,
    spacing: common.spacing,
    typography: common.typography,
    motion: common.motion,
    zIndex: common.zIndex,
    tokens: buildTokens(colors, mode)
  };
}
