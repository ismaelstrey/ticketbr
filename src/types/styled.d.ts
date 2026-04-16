import "styled-components";
import type { ThemeMode } from "@/context/ThemeModeContext";

declare module 'styled-components' {
  export interface DefaultTheme {
    mode: ThemeMode;
    tokens: {
      color: {
        bg: {
          default: string;
          subtle: string;
          surface: string;
          surfaceAlt: string;
          surfaceElevated: string;
          accent: string;
          overlay: string;
          sidebar: string;
          column: string;
          dragOver: string;
        };
        text: {
          primary: string;
          secondary: string;
          muted: string;
          light: string;
          inverse: string;
        };
        border: {
          default: string;
          strong: string;
        };
        status: {
          success: string;
          warning: string;
          info: string;
          purple: string;
          successSurface: string;
          warningSurface: string;
          infoSurface: string;
          successBorder: string;
          warningBorder: string;
          infoBorder: string;
          successText: string;
          warningText: string;
          infoText: string;
        };
        interactive: {
          primary: string;
          primaryHover: string;
          focus: string;
          ghostHover: string;
          chatButtonText: string;
          pillGradients: readonly [string, string, string, string];
          chatButton: string;
        };
        sidebar: {
          border: string;
          muted: string;
          icon: string;
          activeText: string;
          brandGradient: string;
        };
        column: {
          background: string;
          dragOver: string;
          dragBorder: string;
        };
      };
    };
    colors: {
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
    };
    breakpoints: {
      mobile: string;
      tablet: string;
      laptop: string;
      desktop: string;
    };
    shadows: {
      card: string;
      hover: string;
    };
    spacing: {
      1: string;
      2: string;
      3: string;
      4: string;
      5: string;
      6: string;
      8: string;
      10: string;
      12: string;
    };
    typography: {
      family: {
        body: string;
        heading: string;
        mono: string;
      };
      size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        "2xl": string;
      };
      weight: {
        regular: number;
        medium: number;
        semibold: number;
        bold: number;
        extrabold: number;
      };
    };
    motion: {
      fast: string;
      normal: string;
      slow: string;
      easing: string;
    };
    zIndex: {
      overlay: number;
      sidebar: number;
      floating: number;
      toast: number;
    };
    borderRadius: {
      small: string;
      medium: string;
      large: string;
      pill: string;
    };
  }
}
