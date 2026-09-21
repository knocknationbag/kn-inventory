import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function Pagination({ page, pageCount, total, pageSize, basePath, params = {} }) {
  if (total === 0) return null;

  const href = (target) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (target > 1) qs.set("page", String(target));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {first}-{last} of {total}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={buttonClass({ variant: "outline", size: "sm" })}>
              Previous
            </Link>
          ) : (
            <span className={buttonClass({ variant: "outline", size: "sm", className: "pointer-events-none opacity-40" })}>Previous</span>
          )}
          <span className="text-sm text-muted">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={href(page + 1)} className={buttonClass({ variant: "outline", size: "sm" })}>
              Next
            </Link>
          ) : (
            <span className={buttonClass({ variant: "outline", size: "sm", className: "pointer-events-none opacity-40" })}>Next</span>
          )}
        </div>
      )}
    </nav>
  );
}
