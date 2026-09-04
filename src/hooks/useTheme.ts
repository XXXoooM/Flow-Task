import { useEffect } from "react";
import { useUiStore, type Theme } from "@/stores/uiStore";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Resolve a preference to a concrete light/dark value. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

/** Apply the `dark` class + color-scheme to <html>. */
export function applyTheme(theme: Theme): "light" | "dark" {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  return resolved;
}

/** Call once at bootstrap (before first paint) to avoid a theme flash. */
export function initTheme() {
  applyTheme(useUiStore.getState().theme);
}

const ORDER: Theme[] = ["light", "dark", "system"];

/** Reactive theme controller: syncs DOM with the persisted preference. */
export function useTheme() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const cycle = () =>
    setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]);

  return { theme, setTheme, cycle, resolved: resolveTheme(theme) };
}
