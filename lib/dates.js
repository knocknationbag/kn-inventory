import { todayISO } from "@/lib/format";

const pad = (n) => String(n).padStart(2, "0");

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "lastmonth", label: "Last month" },
  { value: "fy", label: "This financial year" },
];

// Date ranges for the quick period chips. Business dates follow India time; the financial year runs April to March.
export function periodRange(period) {
  const today = todayISO();
  const [year, month] = today.split("-").map(Number);
  const monthStart = `${year}-${pad(month)}-01`;
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: monthStart, to: today };
    case "lastmonth": {
      const lastDay = addDays(monthStart, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    }
    case "fy":
      return { from: `${month >= 4 ? year : year - 1}-04-01`, to: today };
    default:
      return { from: "", to: "" };
  }
}

// Every day from `from` to `to` inclusive (used to show days with no sales as zero).
export function eachDay(from, to) {
  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
