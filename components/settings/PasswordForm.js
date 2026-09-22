"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import Icon from "@/components/ui/Icon";
import { changePassword } from "@/lib/actions/settings";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Changing password..." : "Change password"}
    </Button>
  );
}

function PasswordField({ id, name, label, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={name === "new_password" ? 8 : undefined} className={`${inputClass} pr-12`} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink"
        >
          <Icon name={show ? "eyeOff" : "eye"} size={20} />
        </button>
      </div>
    </div>
  );
}

export default function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, {});
  const [key, setKey] = useState(0);

  if (state.success) {
    return (
      <div className="max-w-sm rounded-2xl border border-line bg-success-soft p-5">
        <p className="flex items-start gap-2 text-sm font-medium text-success">
          <Icon name="check" size={18} className="mt-0.5" />
          Password changed.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setKey((k) => k + 1)}
        >
          Change it again
        </Button>
      </div>
    );
  }

  return (
    <form key={key} action={formAction} className="max-w-sm space-y-4" noValidate>
      <PasswordField id="current_password" name="current_password" label="Current password" autoComplete="current-password" />
      <PasswordField id="new_password" name="new_password" label="New password" autoComplete="new-password" />
      <PasswordField id="confirm_password" name="confirm_password" label="Confirm new password" autoComplete="new-password" />
      <p className="text-xs text-muted">At least 8 characters.</p>

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-0.5" />
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
