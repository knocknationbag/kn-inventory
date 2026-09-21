export const RETURN_REASONS = [
  { value: "customer_return", label: "Customer return" },
  { value: "rto", label: "RTO / delivery failure" },
  { value: "defective", label: "Defective / damaged" },
];

export const RETURN_REASON_LABEL = Object.fromEntries(RETURN_REASONS.map((r) => [r.value, r.label]));

// Defective / damaged goods are not sellable, so they are not added back to stock unless the owner says so.
export const defaultRestock = (reason) => reason !== "defective";
