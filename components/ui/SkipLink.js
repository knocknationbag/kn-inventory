// Visible only when focused (first Tab stop), so keyboard users can bypass the nav.
export default function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[calc(0.75rem+env(safe-area-inset-top))] focus:z-[200] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
    >
      Skip to main content
    </a>
  );
}
