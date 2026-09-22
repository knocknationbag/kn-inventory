const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrCents = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat("en-IN");

export function formatCurrency(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? inrWhole.format(n) : inrCents.format(n);
}

export function formatNumber(value) {
  return plain.format(Number(value) || 0);
}

// Dates are plain "YYYY-MM-DD" strings; parse manually so the timezone can never shift the day.
export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

// Business dates follow India time so "today" is right even when the server runs in UTC.
const TIME_ZONE = "Asia/Kolkata";
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export function todayISO() {
  return isoDay.format(new Date());
}

export function plural(count, one, many = `${one}s`) {
  return Number(count) === 1 ? one : many;
}
