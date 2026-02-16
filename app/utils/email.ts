export type EmailSuggestion = {
  original: string;
  suggested: string;
  reason: string;
};

export function normalizeEmail(raw: string) {
  return String(raw || "").trim().toLowerCase();
}

export function isValidEmail(raw: string) {
  const email = normalizeEmail(raw);
  // Basic sanity check (avoid being overly strict for corporate domains)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const DOMAIN_FIXES: Record<string, string> = {
  // Common typos
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "hotmal.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yahho.com": "yahoo.com",
};

export function suggestEmailFix(raw: string): EmailSuggestion | null {
  const email = normalizeEmail(raw);
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain) return null;

  const fixedDomain = DOMAIN_FIXES[domain];
  if (!fixedDomain) return null;

  return {
    original: email,
    suggested: `${local}@${fixedDomain}`,
    reason: `domain:${domain}->${fixedDomain}`,
  };
}
