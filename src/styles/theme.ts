import { DefaultTheme } from "styled-components";

export const theme: DefaultTheme = {
  colors: {
    primary: "#4285ff",
    secondary: "#181a1f",
    background: "#f1f1f1",
    surface: "#ffffff",
    text: {
      primary: "#222222",
      secondary: "#666666",
      light: "#b9c4d6",
      white: "#ffffff",
    },
    status: {
      success: "#27cd8e",
      warning: "#f04f66", // High priority red
      info: "#00a9e0",    // Medium priority blue
      purple: "#9b52d4",
    },
    border: "#dddddd",
    column: {
      background: "#ececec",
      dragOver: "#e5ebff",
      dragBorder: "#5b8cff",
    }
  },
  breakpoints: {
    mobile: "640px",
    tablet: "800px",
    laptop: "1024px",
    desktop: "1200px",
  },
  shadows: {
    card: "0 4px 16px rgba(0, 0, 0, 0.04)",
    hover: "0 8px 24px rgba(0, 0, 0, 0.08)",
  },
  borderRadius: {
    small: "8px",
    medium: "12px",
    large: "14px",
    pill: "999px",
  }
};
