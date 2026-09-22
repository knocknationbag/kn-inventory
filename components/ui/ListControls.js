"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import Icon from "@/components/ui/Icon";
import { inputClass } from "@/components/ui/Field";
import { PERIODS, periodRange } from "@/lib/dates";

// Keeps list state (search, filters, sort, page) in the URL so it survives refresh and back/forward.
function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (changes) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === "" || value == null) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  return { update, pending, searchParams };
}

export function SearchInput({ placeholder = "Search...", param = "q" }) {
  const { update, pending, searchParams } = useQueryUpdater();
  const timer = useRef(null);

  const onChange = (e) => {
    const value = e.target.value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ [param]: value.trim() }), 300);
  };

  return (
    <div className="relative">
      <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        enterKeyHint="search"
        defaultValue={searchParams.get(param) ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputClass} pl-12`}
      />
      {pending && (
        <span aria-hidden="true" className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line-strong border-t-gold" />
      )}
    </div>
  );
}

export function FilterSelect({ param, label, options, allLabel }) {
  const { update, searchParams } = useQueryUpdater();
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={searchParams.get(param) ?? ""}
        onChange={(e) => update({ [param]: e.target.value })}
        className={`${inputClass} h-11`}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DateRange() {
  const { update, searchParams } = useQueryUpdater();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const cls = `${inputClass} h-11`;
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">From</span>
        <input type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value })} className={cls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">To</span>
        <input type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value })} className={cls} />
      </label>
    </div>
  );
}

// Quick period chips (today, last 7 days, this month, ...) that set the from/to dates together.
export function PeriodPresets() {
  const { update, searchParams } = useQueryUpdater();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const options = [{ value: "", label: "All time", range: { from: "", to: "" } }, ...PERIODS.map((p) => ({ ...p, range: periodRange(p.value) }))];

  return (
    <div role="radiogroup" aria-label="Period" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {options.map((o) => {
        const active = from === o.range.from && to === o.range.to;
        return (
          <button
            key={o.value || "all"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => update({ from: o.range.from, to: o.range.to })}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
              active ? "border-primary bg-primary text-on-primary" : "border-line-strong bg-surface text-ink hover:bg-subtle"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChipGroup({ param, label, options }) {
  const { update, searchParams } = useQueryUpdater();
  const current = searchParams.get(param) ?? "";
  return (
    <div role="radiogroup" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {options.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => update({ [param]: o.value })}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
              active ? "border-primary bg-primary text-on-primary" : "border-line-strong bg-surface text-ink hover:bg-subtle"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
