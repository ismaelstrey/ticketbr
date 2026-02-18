import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      surface: string;
      text: {
        primary: string;
        secondary: string;
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
