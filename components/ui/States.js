import Icon from "@/components/ui/Icon";

export function EmptyState({ icon = "package", title, description, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold-text">
        <Icon name={icon} size={26} />
      </span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-line bg-danger-soft px-6 py-12 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface text-danger">
        <Icon name="alert" size={26} />
      </span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-subtle" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-subtle" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-subtle" />
    </div>
  );
}
