"use client";

import { ThemeProvider } from "styled-components";
import { GlobalStyles } from "./GlobalStyles";
import { getTheme } from "./theme";
import { ThemeModeProvider, useThemeMode } from "@/context/ThemeModeContext";

function StyledThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();

  return (
    <ThemeProvider theme={getTheme(mode)}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
}

export function StyledComponentsProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeModeProvider>
      <StyledThemeProvider>{children}</StyledThemeProvider>
    </ThemeModeProvider>
  );
}
