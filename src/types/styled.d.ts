import "styled-components";
import type { ThemeMode } from "@/context/ThemeModeContext";

declare module 'styled-components' {
  export interface DefaultTheme {
    mode: ThemeMode;
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
    borderRadius: {
      small: string;
      medium: string;
      large: string;
      pill: string;
    };
    spacing: Record<1 | 2 | 3 | 4 | 5 | 6 | 8, string>;
    typography: {
      family: {
        body: string;
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
      sidebar: number;
      overlay: number;
      toast: number;
    };
    tokens: {
      color: {
        bg: {
          default: string;
          accent: string;
          surface: string;
          surfaceAlt: string;
          surfaceElevated: string;
          overlay: string;
        };
        text: {
          primary: string;
          secondary: string;
          muted: string;
          inverse: string;
        };
        border: {
          default: string;
          strong: string;
        };
        interactive: {
          primary: string;
          primaryHover: string;
          focus: string;
          ghostHover: string;
          pillGradients: string[];
        };
        status: {
          success: string;
          successSurface: string;
          successBorder: string;
          successText: string;
          warning: string;
          warningSurface: string;
          warningBorder: string;
          warningText: string;
          info: string;
          infoSurface: string;
          infoBorder: string;
          infoText: string;
        };
      };
    };
  }
}
