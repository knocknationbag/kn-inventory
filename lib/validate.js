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
