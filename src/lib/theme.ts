import { useState, useEffect } from "react";

export type Theme = "neon" | "vaporwave" | "emerald" | "steel" | "light";

export const THEMES: { id: Theme; name: string; primary: string; bg: string }[] = [
  { id: "neon", name: "Neon Cyber (Dark)", primary: "#e8ff47", bg: "#0c0c0c" },
  { id: "vaporwave", name: "Vaporwave Sunset", primary: "#ff2a85", bg: "#130922" },
  { id: "emerald", name: "Mint Emerald", primary: "#3ddc84", bg: "#081610" },
  { id: "steel", name: "Steel Ice", primary: "#4a9eff", bg: "#0d1117" },
  { id: "light", name: "Instagram Light Mode", primary: "#ff4d6d", bg: "#fcfcfc" },
];

export function getTheme(): Theme {
  if (typeof window === "undefined") return "neon";
  return (window.localStorage.getItem("sas.theme") as Theme) || "neon";
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("sas.theme", theme);
  const root = document.documentElement;
  root.classList.remove("theme-neon", "theme-vaporwave", "theme-emerald", "theme-steel", "theme-light");
  root.classList.add(`theme-${theme}`);
  // Dispatch event for other hooks/components on same page
  window.dispatchEvent(new Event("sas-theme-changed"));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    // Initial apply on mount
    setTheme(theme);

    const handleThemeChange = () => {
      setThemeState(getTheme());
    };

    window.addEventListener("sas-theme-changed", handleThemeChange);
    return () => {
      window.removeEventListener("sas-theme-changed", handleThemeChange);
    };
  }, [theme]);

  return {
    theme,
    setTheme: (t: Theme) => {
      setTheme(t);
      setThemeState(t);
    },
  };
}
