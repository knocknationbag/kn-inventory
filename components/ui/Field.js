export const inputClass =
  "h-12 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-4 text-ink placeholder:text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Field({ label, id, error, hint, required, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, name, id = name, error, hint, required, className = "", ...props }) {
  return (
    <Field label={label} id={id} error={error} hint={hint} required={required}>
      <input
        id={id}
        name={name}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass} ${className}`}
        {...props}
      />
    </Field>
  );
}

export function SelectField({ label, name, id = name, error, hint, required, options, placeholder, ...props }) {
  return (
    <Field label={label} id={id} error={error} hint={hint} required={required}>
      <select id={id} name={name} className={inputClass} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// Free-text input with suggestions from an existing list (creates a new entry when the name is new).
export function ComboField({ label, name, id = name, error, hint, suggestions, ...props }) {
  return (
    <Field label={label} id={id} error={error} hint={hint}>
      <input id={id} name={name} list={`${id}-list`} autoComplete="off" className={inputClass} {...props} />
      <datalist id={`${id}-list`}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </Field>
  );
}
