export const ENABLE_PHASE1_PASSIVE_INVARIANT_LOGGING =
  String(process.env.AVANZA_PHASE1_PASSIVE_INVARIANT_LOGGING || "true").toLowerCase() === "true";

export const ENABLE_PHASE1_EXPLICIT_CLIENT_INTENT_ENFORCEMENT = false;
export const ENABLE_PHASE1_ESCALATION_HANDLER = false;
export const ENABLE_WORD_MATRIX_SPEC_PRIORITY =
  String(process.env.AVANZA_WORD_MATRIX_SPEC_PRIORITY || "true").toLowerCase() === "true";
