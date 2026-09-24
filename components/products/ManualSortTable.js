"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, useTransition } from "react";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { reorderProducts } from "@/lib/actions/products";

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

// Vertical-only movement: rows slide up and down, never sideways.
const style = (transform, transition) => ({ transform: CSS.Transform.toString(transform && { ...transform, x: 0, scaleX: 1, scaleY: 1 }), transition });

function Handle({ label, setActivatorNodeRef, attributes, listeners }) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={label}
      {...attributes}
      {...listeners}
      className="flex size-10 cursor-grab touch-none items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-gold active:cursor-grabbing"
    >
      <Icon name="grip" size={22} strokeWidth={3} />
    </button>
  );
}

function DesktopRow({ item, disabled }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  return (
    <tr ref={setNodeRef} style={style(transform, transition)} className={`hover:bg-subtle/50 ${isDragging ? "relative z-10 bg-surface shadow-card" : ""}`}>
      <td className="w-12 py-3 pl-2 pr-0 align-middle">
        <Handle label={`Drag to reorder ${item.label}`} setActivatorNodeRef={setActivatorNodeRef} attributes={attributes} listeners={listeners} />
      </td>
      {item.cells.map((cell, i) => (
        <td key={item.columns[i].key} className={`px-4 py-3 align-middle ${ALIGN[item.columns[i].align ?? "left"]}`}>
          {cell}
        </td>
      ))}
    </tr>
  );
}

function MobileRow({ item, disabled }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled });
  return (
    <li ref={setNodeRef} style={style(transform, transition)} className={`flex items-stretch gap-1 ${isDragging ? "relative z-10 opacity-90" : ""}`}>
      <div className="flex w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface shadow-card">
        <Handle label={`Drag to reorder ${item.label}`} setActivatorNodeRef={setActivatorNodeRef} attributes={attributes} listeners={listeners} />
      </div>
      <div className="min-w-0 flex-1">{item.card}</div>
    </li>
  );
}

// The Products list while "Manual" sort is selected. The order changes on screen immediately when a row is
// dropped, then the new order is saved to the database once (never while the row is still moving).
export default function ManualSortTable({ columns, items, note }) {
  const toast = useToast();
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [status, setStatus] = useState("");
  const [saving, startSaving] = useTransition();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, { ...i, columns }])), [items, columns]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const previous = order;
    const next = arrayMove(previous, previous.indexOf(active.id), previous.indexOf(over.id));
    setOrder(next);
    setStatus("Saving order...");
    startSaving(async () => {
      const result = await reorderProducts(next);
      if (result?.error) {
        setOrder(previous);
        setStatus("");
        toast.error(result.error);
      } else {
        setStatus("Order saved.");
      }
    });
  };

  const rows = order.map((id) => byId.get(id)).filter(Boolean);

  return (
    <>
      <p role="status" aria-live="polite" className="mb-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <Icon name="grip" size={18} strokeWidth={3} className="shrink-0" />
        <span>Drag a row by its handle to reorder. Changes save automatically.{note ? ` ${note}` : ""}</span>
        {status && <span className={saving ? "text-muted" : "font-medium text-success"}>{status}</span>}
      </p>

      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface shadow-card md:block">
        <DndContext id="products-manual-desktop" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle/60 text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="w-12 px-2 py-3">
                    <span className="sr-only">Reorder</span>
                  </th>
                  {columns.map((c) => (
                    <th key={c.key} scope="col" className={`px-4 py-3 font-semibold ${ALIGN[c.align ?? "left"]}`}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((item) => (
                  <DesktopRow key={item.id} item={item} disabled={saving} />
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>

      <div className="md:hidden">
        <DndContext id="products-manual-mobile" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {rows.map((item) => (
                <MobileRow key={item.id} item={item} disabled={saving} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}
