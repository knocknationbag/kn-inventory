"use client";

import { useId, useState } from "react";
import { formatCurrency, formatDate, formatNumber, plural } from "@/lib/format";

const HEIGHT = 176;

function niceStep(rawStep) {
  if (rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

// Indian-style compact axis values: 5K, 1.5L, 2Cr.
function compact(value) {
  const trim = (n) => String(Number(n.toFixed(1)));
  if (value >= 1e7) return `${trim(value / 1e7)}Cr`;
  if (value >= 1e5) return `${trim(value / 1e5)}L`;
  if (value >= 1e3) return `${trim(value / 1e3)}K`;
  return String(value);
}

const format = (kind, v) => (kind === "currency" ? formatCurrency(v) : formatNumber(v));

// One-series column chart. Marks are thin, rounded at the tip and flat on the baseline; only the tallest column is labelled,
// every value is reachable by hover, keyboard focus, or the table view.
export default function BarChart({ title, subtitle, data, kind = "currency", unit = "Sales", detailLabel = "bills", detailSingular = "bill" }) {
  const [active, setActive] = useState(null);
  const tableId = useId();

  const max = Math.max(0, ...data.map((d) => d.value));
  const step = niceStep(max / 4);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const peak = max > 0 ? data.findIndex((d) => d.value === max) : -1;

  return (
    <figure className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <figcaption className="mb-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </figcaption>

      {max === 0 ? (
        <p className="flex h-32 items-center justify-center text-sm text-muted">Nothing to show for this period yet.</p>
      ) : (
        <>
          <div className="mt-6 flex" style={{ height: HEIGHT }}>
            <div className="relative w-11 shrink-0" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted" style={{ bottom: `${(t / top) * 100}%` }}>
                  {kind === "currency" ? `₹${compact(t)}` : compact(t)}
                </span>
              ))}
            </div>

            <div className="relative flex-1">
              {ticks.map((t) => (
                <div key={t} className="absolute inset-x-0 border-t border-chart-grid" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true" />
              ))}
              <div className="absolute inset-0 flex items-end" onPointerLeave={() => setActive(null)}>
                {data.map((d, i) => {
                  const pct = (d.value / top) * 100;
                  const isActive = active === i;
                  const align = i < 2 ? "left-0" : i > data.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onPointerEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      aria-label={`${formatDate(d.date)}: ${format(kind, d.value)}, ${d.bills} ${plural(d.bills, detailSingular, detailLabel)}`}
                      className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                    >
                      {d.value > 0 && (
                        <span
                          className={`block w-full max-w-6 rounded-t-[4px] bg-chart transition ${isActive ? "brightness-125" : ""} group-focus-visible:ring-2 group-focus-visible:ring-ink`}
                          style={{ height: `${pct}%` }}
                        />
                      )}
                      {i === peak && !isActive && (
                        <span className="pointer-events-none absolute -translate-y-1 whitespace-nowrap text-[11px] font-semibold text-ink" style={{ bottom: `${pct}%` }}>
                          {kind === "currency" ? `₹${compact(d.value)}` : compact(d.value)}
                        </span>
                      )}
                      {isActive && (
                        <span
                          role="tooltip"
                          className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-2 text-left shadow-lg ${align}`}
                          style={{ bottom: `min(calc(${pct}% + 10px), ${HEIGHT - 52}px)` }}
                        >
                          <span className="block text-base font-bold leading-tight text-ink">{format(kind, d.value)}</span>
                          <span className="block text-xs text-muted">
                            {formatDate(d.date)} · {d.bills} {plural(d.bills, detailSingular, detailLabel)}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="ml-11 mt-1.5 flex" aria-hidden="true">
            {data.map((d, i) => {
              const day = Number(d.date.slice(8));
              const showMonth = i === 0 || day === 1;
              return (
                <span key={d.date} className="min-w-0 flex-1 text-center text-[11px] leading-tight text-muted">
                  {day}
                  {showMonth && <span className="block">{formatDate(d.date).split(" ")[1]}</span>}
                </span>
              );
            })}
          </div>
        </>
      )}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer select-none py-1 font-medium text-muted hover:text-ink">View as table</summary>
        <table id={tableId} className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="py-1.5 font-semibold">Date</th>
              <th scope="col" className="py-1.5 text-right font-semibold">{detailLabel}</th>
              <th scope="col" className="py-1.5 text-right font-semibold">{unit}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...data].reverse().map((d) => (
              <tr key={d.date}>
                <td className="py-1.5">{formatDate(d.date)}</td>
                <td className="py-1.5 text-right tabular-nums">{d.bills}</td>
                <td className="py-1.5 text-right font-medium tabular-nums">{format(kind, d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
