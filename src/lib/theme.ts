import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";

export const ACCENTS: Record<string, { label: string; a: string; b: string }> = {
  blue: { label: "Blue", a: "#4f8cff", b: "#8b5cf6" },
  violet: { label: "Violet", a: "#8b5cf6", b: "#ec4899" },
  teal: { label: "Teal", a: "#14b8a6", b: "#3b82f6" },
  phoenix: { label: "Phoenix", a: "#f97316", b: "#ef4444" },
  green: { label: "Green", a: "#22c55e", b: "#14b8a6" },
};

let mq: MediaQueryList | null = null;
let listener: (() => void) | null = null;
const subscribers = new Set<(dark: boolean) => void>();

export function isDark(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

export function onThemeChange(fn: (dark: boolean) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function setResolved(dark: boolean) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  subscribers.forEach((f) => f(dark));
}

export function applyTheme(pref: string, accent?: string) {
  const a = ACCENTS[accent ?? "blue"] ?? ACCENTS.blue;
  const root = document.documentElement.style;
  root.setProperty("--accent", a.a);
  root.setProperty("--accent-2", a.b);

  if (mq && listener) mq.removeEventListener("change", listener);
  mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (pref === "dark" || pref === "light") {
    listener = null;
    setResolved(pref === "dark");
  } else {
    listener = () => setResolved(mq!.matches);
    mq.addEventListener("change", listener);
    setResolved(mq.matches);
  }
  // Keep the native vibrancy material in sync with the chosen theme.
  getCurrentWindow()
    .setTheme(pref === "system" ? null : (pref as "light" | "dark"))
    .catch(() => undefined);
}

export function useIsDark(): boolean {
  const [dark, setDark] = useState(isDark());
  useEffect(() => onThemeChange(setDark), []);
  return dark;
}
