"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { signIn } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-ink placeholder:text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40";

export default function LoginForm() {
  const [state, formAction] = useActionState(signIn, {});
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          defaultValue={state.email ?? ""}
          placeholder="you@example.com"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${inputClass} pr-12`}
          />
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
