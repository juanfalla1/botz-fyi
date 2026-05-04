function normalizePhone(raw: string) {
  const base = String(raw || "").split(":")[0].split("@")[0];
  return base.replace(/\D/g, "");
}

function phoneTail10(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-10);
}

function normalizeNitParts(rawNit: string): { base: string; dv: string } {
  const cleaned = String(rawNit || "").replace(/\s+/g, "").replace(/\./g, "");
  if (!cleaned) return { base: "", dv: "" };
  if (cleaned.includes("-")) {
    const [base, dv] = cleaned.split("-");
    return {
      base: String(base || "").replace(/\D/g, ""),
      dv: String(dv || "").replace(/\D/g, "").slice(0, 1),
    };
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8) return { base: "", dv: "" };
  return { base: digits.slice(0, -1), dv: digits.slice(-1) };
}

function areEquivalentNitValues(aRaw: string, bRaw: string): boolean {
  const a = String(aRaw || "").replace(/\D/g, "").trim();
  const b = String(bRaw || "").replace(/\D/g, "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const short = a.length <= b.length ? a : b;
  const long = a.length > b.length ? a : b;
  if (long.length === short.length + 1 && long.startsWith(short)) return true;
  return false;
}

export function extractCompanyNit(text: string): string {
  const raw = String(text || "");
  const labeled = raw.match(/\bnit\s*[:=]?\s*([0-9.\-]{5,20})/i)?.[1] || "";
  const fallback = (!labeled ? raw.match(/\b([0-9]{7,14}(?:-[0-9])?)\b/)?.[1] : "") || "";
  return String(labeled || fallback).replace(/[^0-9.-]/g, "").trim();
}

export function isValidColombianNit(rawNit: string): boolean {
  const digitsOnly = String(rawNit || "").replace(/\D/g, "");
  if (/^\d{8,12}$/.test(digitsOnly)) return true;
  const { base, dv } = normalizeNitParts(rawNit);
  if (!base || !dv) return false;
  if (!/^\d{6,12}$/.test(base) || !/^\d$/.test(dv)) return false;
  const weights = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];
  const digits = base.split("").map((d) => Number(d));
  if (digits.length > weights.length) return false;
  const offset = weights.length - digits.length;
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) sum += digits[i] * weights[offset + i];
  const remainder = sum % 11;
  const expected = remainder > 1 ? 11 - remainder : remainder;
  return expected === Number(dv);
}

export async function findCommercialContactByIdentifiers(args: {
  supabase: any;
  ownerId: string;
  lookupNit?: string;
  lookupPhone?: string;
  lookupPhoneTail?: string;
}): Promise<{ matchedContact: any | null; fallbackCandidatesCount: number }> {
  const supabase = args.supabase;
  const ownerId = String(args.ownerId || "").trim();
  const lookupNit = String(args.lookupNit || "").replace(/\D/g, "").trim();
  const lookupPhone = normalizePhone(String(args.lookupPhone || "").trim());
  const lookupPhoneTail = phoneTail10(args.lookupPhoneTail || lookupPhone);
  if (!supabase || !ownerId) return { matchedContact: null, fallbackCandidatesCount: 0 };

  let matchedContact: any = null;
  let fallbackCandidatesCount = 0;

  try {
    if (lookupNit) {
      const { data: byNitKey } = await supabase
        .from("agent_crm_contacts")
        .select("id,name,email,phone,company,contact_key,metadata,updated_at")
        .eq("created_by", ownerId)
        .eq("contact_key", `nit:${lookupNit}`)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (Array.isArray(byNitKey) && byNitKey[0]) matchedContact = byNitKey[0];

      if (!matchedContact) {
        const { data: byNitPrefix } = await supabase
          .from("agent_crm_contacts")
          .select("id,name,email,phone,company,contact_key,metadata,updated_at")
          .eq("created_by", ownerId)
          .like("contact_key", `nit:${lookupNit}%`)
          .order("updated_at", { ascending: false })
          .limit(5);
        if (Array.isArray(byNitPrefix) && byNitPrefix[0]) matchedContact = byNitPrefix[0];
      }

      if (!matchedContact) {
        const { data: byNitMeta } = await supabase
          .from("agent_crm_contacts")
          .select("id,name,email,phone,company,contact_key,metadata,updated_at")
          .eq("created_by", ownerId)
          .contains("metadata", { nit: lookupNit })
          .order("updated_at", { ascending: false })
          .limit(5);
        if (Array.isArray(byNitMeta) && byNitMeta[0]) matchedContact = byNitMeta[0];
      }
    }

    if (!matchedContact && lookupPhoneTail) {
      const { data: byPhoneKey } = await supabase
        .from("agent_crm_contacts")
        .select("id,name,email,phone,company,contact_key,metadata,updated_at")
        .eq("created_by", ownerId)
        .or(`contact_key.eq.cel:${lookupPhone},contact_key.eq.cel:${lookupPhoneTail},phone.eq.${lookupPhone},phone.like.%${lookupPhoneTail}`)
        .order("updated_at", { ascending: false })
        .limit(10);
      if (Array.isArray(byPhoneKey) && byPhoneKey[0]) matchedContact = byPhoneKey[0];
    }

    if (!matchedContact && (lookupNit || lookupPhoneTail)) {
      const { data: crmCandidates } = await supabase
        .from("agent_crm_contacts")
        .select("id,name,email,phone,company,contact_key,metadata,updated_at")
        .eq("created_by", ownerId)
        .order("updated_at", { ascending: false })
        .limit(10000);
      const candidates = Array.isArray(crmCandidates) ? crmCandidates : [];
      fallbackCandidatesCount = candidates.length;
      matchedContact = candidates.find((c: any) => {
        const cPhone = normalizePhone(String(c?.phone || ""));
        const cTail = phoneTail10(cPhone);
        const cNit = String((c?.metadata && typeof c.metadata === "object" ? c.metadata.nit : "") || "").replace(/\D/g, "").trim();
        const cContactKey = String(c?.contact_key || "").trim().toLowerCase();
        const cContactKeyDigits = cContactKey.replace(/\D/g, "").trim();
        const cContactKeyTail = phoneTail10(cContactKeyDigits);
        const phoneMatch = Boolean(lookupPhoneTail) && Boolean(cTail) && cTail === lookupPhoneTail;
        const nitMatch = Boolean(lookupNit) && Boolean(cNit) && areEquivalentNitValues(cNit, lookupNit);
        const nitByContactKey = Boolean(lookupNit) && cContactKey.startsWith("nit:") && areEquivalentNitValues(cContactKeyDigits, lookupNit);
        const phoneByContactKey = Boolean(lookupPhoneTail) && cContactKey.startsWith("cel:") && Boolean(cContactKeyTail) && cContactKeyTail === lookupPhoneTail;
        return phoneMatch || nitMatch || nitByContactKey || phoneByContactKey;
      }) || null;
    }
  } catch {}

  return { matchedContact: matchedContact || null, fallbackCandidatesCount };
}
