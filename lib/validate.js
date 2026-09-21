export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readText(formData, key, max = 200) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

// Empty input counts as `fallback`; anything else must be a number inside [min, max].
export function readNumber(formData, key, { label, min = 0, max = 1e9, integer = false, fallback = 0 }, errors) {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    errors[key] = `${label} must be a number.`;
    return fallback;
  }
  if (integer && !Number.isInteger(n)) {
    errors[key] = `${label} must be a whole number.`;
    return fallback;
  }
  if (n < min || n > max) {
    errors[key] = `${label} must be between ${min} and ${max}.`;
    return fallback;
  }
  return n;
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function readDate(formData, key, errors, label = "Date") {
  const raw = readText(formData, key, 10);
  if (!isValidDate(raw)) {
    errors[key] = `${label} is required.`;
    return "";
  }
  return raw;
}

// Parses the JSON line items posted by a form; every line must reference a real product.
export function parseLines(raw, { max = 100, rateKey = "rate" } = {}) {
  let list;
  try {
    list = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { error: "The product list could not be read. Please try again." };
  }
  if (!Array.isArray(list) || list.length === 0) return { error: "Add at least one product." };
  if (list.length > max) return { error: `A maximum of ${max} lines is allowed.` };

  const items = [];
  for (const [i, line] of list.entries()) {
    const quantity = Number(line.quantity);
    const rate = line[rateKey] === "" || line[rateKey] == null ? 0 : Number(line[rateKey]);
    if (!UUID_RE.test(String(line.product_id ?? ""))) return { error: `Line ${i + 1}: choose a product.` };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1e6) return { error: `Line ${i + 1}: quantity must be a whole number of 1 or more.` };
    if (!Number.isFinite(rate) || rate < 0 || rate > 1e7) return { error: `Line ${i + 1}: rate must be 0 or more.` };
    items.push({ product_id: line.product_id, quantity, rate });
  }
  return { items };
}

// Neutralise characters that have meaning inside PostgREST filter strings and LIKE patterns.
export function cleanSearch(q) {
  return String(q ?? "")
    .replace(/[,()"'\\%_*:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function escapeLike(text) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
