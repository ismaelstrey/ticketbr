"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

interface ThemeModeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

const STORAGE_KEY = "ticketbr-theme-mode";

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const storedMode = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (storedMode === "dark" || storedMode === "light") {
      setModeState(storedMode);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setModeState(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      toggleMode: () => setModeState((current) => (current === "dark" ? "light" : "dark")),
      setMode: (nextMode: ThemeMode) => setModeState(nextMode)
    }),
    [mode]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }

  return context;
}
