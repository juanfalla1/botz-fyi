import crypto from "node:crypto";

type EncValue = {
  __enc: true;
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

function getKey() {
  const secret = String(process.env.AGENTS_CONFIG_SECRET || "").trim();
  if (!secret) {
    throw new Error("Missing AGENTS_CONFIG_SECRET");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function isSecretKey(key: string) {
  return /(token|secret|password|access_key|auth_token|verify_token|api_key|sid)/i.test(String(key || ""));
}

export function encryptString(plain: string): EncValue {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain || ""), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    __enc: true,
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function isEncryptedValue(v: any): v is EncValue {
  return !!v && v.__enc === true && v.v === 1 && typeof v.iv === "string" && typeof v.tag === "string" && typeof v.data === "string";
}

export function decryptString(v: EncValue) {
  const key = getKey();
  const iv = Buffer.from(v.iv, "base64");
  const tag = Buffer.from(v.tag, "base64");
  const data = Buffer.from(v.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

export function protectConfig(input: any) {
  const cfg = input && typeof input === "object" ? { ...input } : {};
  for (const [k, val] of Object.entries(cfg)) {
    if (!isSecretKey(k)) continue;
    if (val == null || val === "") continue;
    if (isEncryptedValue(val)) continue;
    cfg[k] = encryptString(String(val));
  }
  return cfg;
}

export function redactConfig(input: any) {
  const cfg = input && typeof input === "object" ? { ...input } : {};
  for (const [k, val] of Object.entries(cfg)) {
    if (isEncryptedValue(val) || isSecretKey(k)) {
      cfg[k] = "••••••••";
    }
  }
  return cfg;
}

export function revealConfig(input: any) {
  const cfg = input && typeof input === "object" ? { ...input } : {};
  for (const [k, val] of Object.entries(cfg)) {
    if (!isEncryptedValue(val)) continue;
    try {
      cfg[k] = decryptString(val);
    } catch {
      cfg[k] = "";
    }
  }
  return cfg;
}
