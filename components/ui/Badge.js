const TONES = {
  neutral: "bg-subtle text-muted",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  gold: "bg-gold-soft text-gold-text",
};

export default function Badge({ tone = "neutral", children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
  );
}
