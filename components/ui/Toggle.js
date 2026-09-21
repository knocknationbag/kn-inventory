"use client";

// Accessible on/off switch. Renders a hidden checkbox so it posts as a normal form field ("on" when enabled).
export default function Toggle({ name, label, description, checked, onChange }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
      <span className="min-w-0">
        <span className="block font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <span className="relative shrink-0">
        <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block h-7 w-12 rounded-full bg-line-strong transition peer-checked:bg-gold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold" />
        <span className="absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
