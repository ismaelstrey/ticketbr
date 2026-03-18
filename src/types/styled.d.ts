import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
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
  }
}
