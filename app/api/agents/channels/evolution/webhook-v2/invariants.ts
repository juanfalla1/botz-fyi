type Phase1InvariantInput = {
  inboundText: string;
  outboundText?: string;
  strict: boolean;
  route?: string;
  intent?: string;
  awaitingAction?: string;
};

function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isAffirmativeShort(text: string): boolean {
  const t = normalizeText(text);
  if (!t) return false;
  return /^(si|ok|dale|de\s+una|listo|hagamoslo|hagamoslo\s+asi|perfecto)$/.test(t);
}

function detectExplicitClientChoice(text: string): "new" | "existing" | "" {
  const t = normalizeText(text).replace(/[^a-z0-9\s]/g, " ").trim();
  if (/^1$/.test(t) || /cliente\s+nuevo|soy\s+nuevo/.test(t)) return "new";
  if (/^2$/.test(t) || /ya\s+soy\s+cliente|ya\s+los\s+conozco|cliente\s+de\s+avanza/.test(t)) return "existing";
  return "";
}

function isAdvisorIntent(text: string): boolean {
  const t = normalizeText(text);
  if (!t) return false;
  return /(\bcita\b|\basesor\b|asesor\s+humano|asesor\s+comercial|agendar|agenda|llamada\s+con\s+asesor|quiero\s+hablar\s+con\s+asesor|mariana|transferir\s+asesor|pasame\s+con\s+asesor)/.test(t);
}

export function buildPhase1InvariantSnapshot(input: Phase1InvariantInput) {
  const inboundText = String(input.inboundText || "").trim();
  const outboundText = String(input.outboundText || "").trim();
  const awaitingAction = String(input.awaitingAction || "").trim();
  const explicitClientChoice = detectExplicitClientChoice(inboundText);
  const affirmativeShort = isAffirmativeShort(inboundText);
  const advisorIntent = isAdvisorIntent(inboundText);

  return {
    schema: "phase1-invariants-v1",
    strict: Boolean(input.strict),
    route: String(input.route || "") || null,
    intent: String(input.intent || "") || null,
    awaiting_action: awaitingAction || null,
    checks: {
      client_choice_explicit: explicitClientChoice || null,
      client_choice_not_from_affirmative_short: !(affirmativeShort && !explicitClientChoice),
      advisor_intent_detected: advisorIntent,
      advisor_transition_present: advisorIntent
        ? /advisor_meeting_slot|conversation_followup/.test(awaitingAction)
        : null,
    },
    preview: {
      inbound: inboundText.slice(0, 120),
      outbound: outboundText.slice(0, 120),
    },
  };
}
