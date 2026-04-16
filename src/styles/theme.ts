import { DefaultTheme } from "styled-components";
import { ThemeMode } from "@/context/ThemeModeContext";

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
    8: "2rem",
    10: "2.5rem",
    12: "3rem"
  },
  typography: {
    family: {
      body: "Manrope, system-ui, -apple-system, sans-serif",
      heading: "Manrope, system-ui, -apple-system, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, monospace"
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
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    }
  },
  motion: {
    fast: "120ms",
    normal: "200ms",
    slow: "320ms",
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)"
  },
  zIndex: {
    overlay: 50,
    sidebar: 100,
    floating: 120,
    toast: 9999
  }
} satisfies Pick<
  DefaultTheme,
  "breakpoints" | "borderRadius" | "spacing" | "typography" | "motion" | "zIndex"
>;

const palettes = {
  light: {
    bg: {
      default: "#f3f7fb",
      subtle: "#eef4ff",
      surface: "#ffffff",
      surfaceAlt: "#f8fafc",
      surfaceElevated: "rgba(255, 255, 255, 0.88)",
      accent: "radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 42%)",
      overlay: "rgba(15, 23, 42, 0.35)",
      sidebar: "linear-gradient(180deg, #ffffff 0%, #f8fbff 48%, #eef4ff 100%)",
      column: "#e8eef7",
      dragOver: "#dbeafe"
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
      muted: "#64748b",
      light: "#b9c4d6",
      inverse: "#ffffff"
    },
    border: {
      default: "rgba(148, 163, 184, 0.22)",
      strong: "rgba(100, 116, 139, 0.4)"
    },
    interactive: {
      primary: "#2563eb",
      primaryHover: "#1d4ed8",
      focus: "rgba(37, 99, 235, 0.28)",
      ghostHover: "rgba(148, 163, 184, 0.1)",
      chatButtonText: "#0f172a",
      pillGradients: [
        "linear-gradient(135deg, #3b82f6, #1d4ed8)",
        "linear-gradient(135deg, #34d399, #10b981)",
        "linear-gradient(135deg, #8b5cf6, #7c3aed)",
        "linear-gradient(135deg, #38bdf8, #2563eb)"
      ],
      chatButton:
        "linear-gradient(135deg, rgba(15, 23, 42, 0.06), rgba(99, 102, 241, 0.18))"
    },
    status: {
      success: "#16a34a",
      warning: "#ef4444",
      info: "#0ea5e9",
      purple: "#8b5cf6",
      successSurface: "#f0fdf4",
      warningSurface: "#fef2f2",
      infoSurface: "#eff6ff",
      successBorder: "#86efac",
      warningBorder: "#fca5a5",
      infoBorder: "#93c5fd",
      successText: "#166534",
      warningText: "#991b1b",
      infoText: "#1e3a8a"
    },
    sidebar: {
      border: "rgba(148, 163, 184, 0.22)",
      muted: "#64748b",
      icon: "#2563eb",
      activeText: "#0f172a",
      brandGradient: "linear-gradient(135deg, #38bdf8 0%, #6366f1 55%, #8b5cf6 100%)"
    },
    column: {
      dragBorder: "#3b82f6"
    }
  },
  dark: {
    bg: {
      default: "#020617",
      subtle: "#0b1220",
      surface: "#0f172a",
      surfaceAlt: "#111827",
      surfaceElevated: "rgba(15, 23, 42, 0.82)",
      accent: "radial-gradient(circle at top, rgba(56, 189, 248, 0.14), transparent 38%)",
      overlay: "rgba(2, 6, 23, 0.65)",
      sidebar: "linear-gradient(180deg, #0f172a 0%, #111c34 55%, #13213f 100%)",
      column: "#0b1220",
      dragOver: "#12243d"
    },
    text: {
      primary: "#f8fafc",
      secondary: "#cbd5e1",
      muted: "#94a3b8",
      light: "#94a3b8",
      inverse: "#ffffff"
    },
    border: {
      default: "rgba(148, 163, 184, 0.18)",
      strong: "rgba(148, 163, 184, 0.32)"
    },
    interactive: {
      primary: "#60a5fa",
      primaryHover: "#93c5fd",
      focus: "rgba(96, 165, 250, 0.3)",
      ghostHover: "rgba(148, 163, 184, 0.14)",
      chatButtonText: "#ffffff",
      pillGradients: [
        "linear-gradient(135deg, #60a5fa, #3b82f6)",
        "linear-gradient(135deg, #4ade80, #22c55e)",
        "linear-gradient(135deg, #a78bfa, #8b5cf6)",
        "linear-gradient(135deg, #38bdf8, #2563eb)"
      ],
      chatButton:
        "linear-gradient(135deg, rgba(37, 99, 235, 0.65), rgba(139, 92, 246, 0.75))"
    },
    status: {
      success: "#22c55e",
      warning: "#f87171",
      info: "#38bdf8",
      purple: "#a78bfa",
      successSurface: "rgba(34, 197, 94, 0.14)",
      warningSurface: "rgba(248, 113, 113, 0.14)",
      infoSurface: "rgba(56, 189, 248, 0.14)",
      successBorder: "rgba(34, 197, 94, 0.35)",
      warningBorder: "rgba(248, 113, 113, 0.35)",
      infoBorder: "rgba(56, 189, 248, 0.35)",
      successText: "#bbf7d0",
      warningText: "#fecaca",
      infoText: "#bae6fd"
    },
    sidebar: {
      border: "rgba(148, 163, 184, 0.18)",
      muted: "#94a3b8",
      icon: "#93c5fd",
      activeText: "#f8fafc",
      brandGradient: "linear-gradient(135deg, #38bdf8 0%, #6366f1 55%, #8b5cf6 100%)"
    },
    column: {
      dragBorder: "#60a5fa"
    }
  }
} as const;

function createTheme(mode: ThemeMode): DefaultTheme {
  const palette = mode === "dark" ? palettes.dark : palettes.light;

  return {
    mode,
    tokens: {
      color: {
        bg: palette.bg,
        text: palette.text,
        border: palette.border,
        status: palette.status,
        interactive: palette.interactive,
        sidebar: palette.sidebar,
        column: {
          background: palette.bg.column,
          dragOver: palette.bg.dragOver,
          dragBorder: palette.column.dragBorder
        }
      }
    },
    colors: {
      primary: palette.interactive.primary,
      primaryHover: palette.interactive.primaryHover,
      secondary: palette.bg.subtle,
      background: palette.bg.default,
      backgroundAccent: palette.bg.accent,
      surface: palette.bg.surface,
      surfaceAlt: palette.bg.surfaceAlt,
      surfaceElevated: palette.bg.surfaceElevated,
      text: {
        primary: palette.text.primary,
        secondary: palette.text.secondary,
        muted: palette.text.muted,
        light: palette.text.light,
        white: palette.text.inverse
      },
      status: {
        success: palette.status.success,
        warning: palette.status.warning,
        info: palette.status.info,
        purple: palette.status.purple
      },
      border: palette.border.default,
      borderStrong: palette.border.strong,
      overlay: palette.bg.overlay,
      sidebar: {
        background: palette.bg.sidebar,
        border: palette.sidebar.border,
        muted: palette.sidebar.muted,
        icon: palette.sidebar.icon,
        activeText: palette.sidebar.activeText
      },
      column: {
        background: palette.bg.column,
        dragOver: palette.bg.dragOver,
        dragBorder: palette.column.dragBorder
      }
    },
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
    zIndex: common.zIndex
  };
}

export function getTheme(mode: ThemeMode): DefaultTheme {
  return createTheme(mode);
}
