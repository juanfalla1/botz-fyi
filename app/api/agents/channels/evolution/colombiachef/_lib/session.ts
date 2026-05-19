import { Redis } from "@upstash/redis";

type ProductLite = {
  name: string;
  price: string;
  url: string;
};

type CustomerSession = {
  lastCategory: string;
  lastShownUrls: string[];
  lastResults: ProductLite[];
  lastUserMessage: string;
  welcomed: boolean;
  expectedAction: string;
  lastAssistantType: string;
  pendingOrder?: {
    productName: string;
    productUrl: string;
    productPrice: string;
    talla: string;
    color: string;
    cantidad: string;
    ciudad: string;
  };
  cartItems?: Array<{
    productName: string;
    productUrl: string;
    productPrice: string;
    quantity: number;
  }>;
  billingData?: {
    nombres: string;
    apellidos: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    ciudad: string;
    departamento: string;
    direccion: string;
    telefono: string;
    correo: string;
  };
  billingStep?: string;
  updatedAt: number;
};

const TTL_MS = 30 * 60 * 1000;
const memory = new Map<string, CustomerSession>();

function getRedisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

const redis = getRedisClient();
const REDIS_PREFIX = "colombiachef:session:";

function cleanup() {
  const now = Date.now();
  for (const [key, value] of memory.entries()) {
    if (now - value.updatedAt > TTL_MS) memory.delete(key);
  }
}

export function getSession(customerId: string): CustomerSession | null {
  cleanup();
  return memory.get(customerId) || null;
}

export async function hydrateSession(customerId: string): Promise<void> {
  cleanup();
  if (memory.has(customerId) || !redis) return;
  try {
    const key = `${REDIS_PREFIX}${customerId}`;
    const data = (await redis.get(key)) as CustomerSession | null;
    if (data && typeof data === "object") {
      memory.set(customerId, data);
    }
  } catch {
    // ignore redis read errors
  }
}

export function saveSession(customerId: string, patch: Partial<CustomerSession>): CustomerSession {
  const previous = getSession(customerId) || {
    lastCategory: "",
    lastShownUrls: [],
      lastResults: [],
      lastUserMessage: "",
      welcomed: false,
      expectedAction: "",
      lastAssistantType: "",
      updatedAt: Date.now(),
    };
  const next = {
    ...previous,
    ...patch,
    updatedAt: Date.now(),
  };
  memory.set(customerId, next);
  if (redis) {
    const key = `${REDIS_PREFIX}${customerId}`;
    void redis.set(key, next, { ex: Math.ceil(TTL_MS / 1000) }).catch(() => undefined);
  }
  return next;
}
