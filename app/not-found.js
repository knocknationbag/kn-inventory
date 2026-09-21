import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <div className="w-full">
        <EmptyState
          icon="search"
          title="Page not found"
          description="That page doesn't exist or has moved."
          action={<Button href="/">Back to dashboard</Button>}
        />
      </div>
    </main>
  );
}
