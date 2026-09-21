"use client";

import Button from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

export default function GlobalError({ reset }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <div className="w-full">
        <ErrorState
          description="An unexpected error occurred. Your data is safe. Try again."
          action={<Button onClick={() => reset()}>Try again</Button>}
        />
      </div>
    </main>
  );
}
