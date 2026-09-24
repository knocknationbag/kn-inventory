import QRCode from "qrcode";

// A standard UPI deep link: any UPI app (GPay, PhonePe, Paytm, BHIM...) opens this pre-filled with the
// payee and amount. `cu=INR` is required for the amount to reliably pre-fill across apps.
export function buildUpiUri({ upiId, payeeName, amount }) {
  const params = [
    `pa=${encodeURIComponent(upiId)}`,
    `pn=${encodeURIComponent(payeeName || "")}`,
    `am=${encodeURIComponent(Number(amount || 0).toFixed(2))}`,
    "cu=INR",
  ];
  return `upi://pay?${params.join("&")}`;
}

// A PNG data URL of the QR for a UPI payment, or null if no UPI ID is configured. Works in the browser
// (for the PDF, generated on demand) and on the server (for the on-screen invoice page) alike.
export async function buildUpiQrDataUrl({ upiId, payeeName, amount }) {
  const id = String(upiId ?? "").trim();
  if (!id) return null;
  try {
    return await QRCode.toDataURL(buildUpiUri({ upiId: id, payeeName, amount }), { margin: 1, width: 300 });
  } catch {
    return null;
  }
}
