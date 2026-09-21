"use client";

import { useEffect, useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";

const KEY = "kn-theme";
const OPTIONS = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "monitor" },
];

const listeners = new Set();

function readPreference() {
  try {
    return localStorage.getItem(KEY) || "system";
  } catch {
    return "system";
  }
}

function applyTheme(pref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function setPreference(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
  applyTheme(pref);
  listeners.forEach((l) => l());
}

function subscribe(callback) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function usePreference() {
  const pref = useSyncExternalStore(subscribe, readPreference, () => "system");

  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  return pref;
}

export default function ThemeSwitcher({ variant = "button" }) {
  const pref = usePreference();

  if (variant === "segmented") {
    return (
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-full bg-subtle p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={pref === o.value}
            onClick={() => setPreference(o.value)}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition ${
              pref === o.value ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
            }`}
          >
            <Icon name={o.icon} size={18} />
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[2];
  const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
  return (
    <button
      type="button"
      onClick={() => setPreference(next.value)}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label}`}
      className="flex size-11 items-center justify-center rounded-full text-ink transition hover:bg-subtle"
    >
      <Icon name={current.icon} />
    </button>
  );
}
