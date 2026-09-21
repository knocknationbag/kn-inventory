const TONES = { default: "text-ink", warn: "text-warn", danger: "text-danger", success: "text-success" };

export default function StatCard({ label, value, hint, tone = "default" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-card sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs">{label}</p>
      <p className={`mt-1 truncate text-xl font-bold tracking-tight sm:mt-2 sm:text-2xl ${TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 hidden truncate text-xs text-muted sm:block">{hint}</p>}
    </div>
  );
}
