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
  updatedAt: number;
};

const TTL_MS = 30 * 60 * 1000;
const memory = new Map<string, CustomerSession>();

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
  return next;
}
