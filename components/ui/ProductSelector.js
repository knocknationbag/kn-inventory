"use client";

import { useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { inputClass } from "@/components/ui/Field";

const MAX_SHOWN = 60;

function describe(p) {
  return [p.name, p.colour, p.size].filter(Boolean).join(" · ");
}

// Searchable product picker. Opens as a bottom sheet on phones and a centred dialog on larger screens.
export default function ProductSelector({ id, products, value, onChange, invalid, placeholder = "Choose product" }) {
  const dialogRef = useRef(null);
  const [query, setQuery] = useState("");
  const selected = products.find((p) => p.id === value);

  const matches = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return products;
    return products.filter((p) => {
      const hay = `${p.sku} ${p.name} ${p.colour} ${p.size}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [products, query]);

  const open = () => {
    setQuery("");
    dialogRef.current?.showModal();
  };
  const pick = (product) => {
    onChange(product);
    dialogRef.current?.close();
  };

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={open}
        className={`${inputClass} flex items-center justify-between gap-2 text-left ${invalid ? "border-danger" : ""}`}
      >
        {selected ? (
          <span className="min-w-0 truncate">
            <span className="font-semibold">{selected.sku}</span>
            {describe(selected) && <span className="text-muted"> · {describe(selected)}</span>}
          </span>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <Icon name="search" size={18} className="text-muted" />
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
        className="m-auto max-h-[85dvh] w-full max-w-lg open:flex open:flex-col rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50 max-md:mb-0 max-md:max-w-none max-md:rounded-b-none"
      >
        <div className="flex items-center gap-2 border-b border-line p-3">
          <div className="relative flex-1">
            <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SKU, name, colour..."
              aria-label="Search products"
              className={`${inputClass} pl-12`}
            />
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close" className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-ink">
            <Icon name="x" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto overscroll-contain p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {matches.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No product matches &ldquo;{query}&rdquo;.</li>}
          {matches.slice(0, MAX_SHOWN).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(p)}
                className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-subtle ${p.id === value ? "bg-gold-soft" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.sku}</span>
                  <span className="block truncate text-sm text-muted">{describe(p) || "-"}</span>
                </span>
                <span className={`shrink-0 text-sm font-medium ${p.current_stock <= 0 ? "text-danger" : "text-muted"}`}>{p.current_stock} in stock</span>
              </button>
            </li>
          ))}
          {matches.length > MAX_SHOWN && <li className="px-3 py-3 text-center text-xs text-muted">Showing {MAX_SHOWN} of {matches.length}. Type to narrow down.</li>}
        </ul>
      </dialog>
    </>
  );
}
