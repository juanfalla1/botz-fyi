export function normalizePhone(raw: string): string {
  const base = String(raw || "").split(":")[0].split("@")[0];
  const digits = base.replace(/\D/g, "");

  if (raw.includes("@lid") && digits) {
    return digits;
  }

  return digits;
}

export function normalizeRealCustomerPhone(raw: string): string {
  const n = normalizePhone(raw || "");
  if (!n) return "";
  if (n.length === 10) return n;
  if (n.length === 12 && n.startsWith("57")) return n;
  if (n.length === 11 && n.startsWith("1")) return n;
  return "";
}
