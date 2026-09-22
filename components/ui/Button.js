import Link from "next/link";

const VARIANTS = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  gold: "bg-gold text-on-gold hover:brightness-95",
  outline: "border border-line-strong bg-surface text-ink hover:bg-subtle",
  ghost: "text-ink hover:bg-subtle",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES = {
  md: "min-h-11 px-5 text-[15px]",
  lg: "min-h-12 px-6 text-base",
  sm: "min-h-10 px-4 text-sm",
};

export function buttonClass({ variant = "primary", size = "md", className = "" } = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition select-none disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export default function Button({ href, variant, size, className, children, ...props }) {
  const cls = buttonClass({ variant, size, className });
  if (href) {
    return (
      <Link href={href} className={cls} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
