"use client";

import { useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";

function subscribe(callback) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}

const isFullscreen = () => Boolean(document.fullscreenElement);
const isSupported = () => Boolean(document.fullscreenEnabled);

export function useFullscreen() {
  const active = useSyncExternalStore(subscribe, isFullscreen, () => false);
  const supported = useSyncExternalStore(subscribe, isSupported, () => false);

  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Browser refused (needs a user gesture / not allowed here); nothing to do.
    }
  };

  return { active, supported, toggle };
}

export default function FullscreenButton({ variant = "icon" }) {
  const { active, supported, toggle } = useFullscreen();
  if (!supported) return null;

  const label = active ? "Exit fullscreen" : "Enter fullscreen";
  const icon = active ? "minimize" : "maximize";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-left font-medium text-ink"
      >
        <Icon name={icon} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex size-11 items-center justify-center rounded-full text-ink transition hover:bg-subtle"
    >
      <Icon name={icon} />
    </button>
  );
}
