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
  const [hasUserPreference, setHasUserPreference] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (storedMode === "dark" || storedMode === "light") {
      setModeState(storedMode);
      setHasUserPreference(true);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setModeState(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (hasUserPreference) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setModeState(media.matches ? "dark" : "light");
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [hasUserPreference]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      toggleMode: () => {
        setHasUserPreference(true);
        setModeState((current) => (current === "dark" ? "light" : "dark"));
      },
      setMode: (nextMode: ThemeMode) => {
        setHasUserPreference(true);
        setModeState(nextMode);
      }
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
