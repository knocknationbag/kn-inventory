const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));
const three = (n) => (n < 100 ? two(n) : `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${two(n % 100)}` : ""}`);

function wholeInWords(value) {
  if (value === 0) return "Zero";
  let n = value;
  const parts = [];
  for (const [unit, name] of [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]]) {
    const q = Math.floor(n / unit);
    if (q) parts.push(`${three(q)} ${name}`);
    n %= unit;
  }
  if (n) parts.push(three(n));
  return parts.join(" ");
}

// 1234.5 -> "Rupees One Thousand Two Hundred Thirty Four and Fifty Paise Only" (Indian lakh/crore grouping).
export function amountInWords(amount) {
  const cents = Math.round((Math.abs(Number(amount) || 0) + Number.EPSILON) * 100);
  const rupees = Math.floor(cents / 100);
  const paise = cents % 100;
  const rupeePart = `Rupees ${wholeInWords(rupees)}`;
  return paise ? `${rupeePart} and ${two(paise)} Paise Only` : `${rupeePart} Only`;
}
