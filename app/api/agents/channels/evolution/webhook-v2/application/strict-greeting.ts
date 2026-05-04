export function applyStrictGreetingGate(args: {
  strictReply: string;
  isGreeting: boolean;
  explicitModel: boolean;
  categoryIntent: boolean;
  wantsQuote: boolean;
  wantsSheet: boolean;
  previousMemory?: Record<string, any>;
  strictMemory: Record<string, any>;
  recognizedReturningCustomer: boolean;
  existingTranscriptLength: number;
  knownCustomerName: string;
  buildGreetingReply: (knownCustomerName: string, memory: any) => string;
  buildCommercialWelcomeMessage: () => string;
}): string {
  if (String(args.strictReply || "").trim()) return args.strictReply;
  if (!args.isGreeting || args.explicitModel || args.categoryIntent || args.wantsQuote || args.wantsSheet) {
    return args.strictReply;
  }

  const hasPriorConversation =
    Boolean(args.previousMemory?.last_user_at || args.previousMemory?.last_intent || args.previousMemory?.last_quote_draft_id) ||
    Boolean(args.previousMemory?.recognized_returning_customer || args.strictMemory?.recognized_returning_customer || args.recognizedReturningCustomer) ||
    args.existingTranscriptLength > 0;

  args.strictMemory.awaiting_action = "none";
  args.strictMemory.pending_product_options = [];
  args.strictMemory.pending_family_options = [];
  args.strictMemory.strict_model_offset = 0;
  args.strictMemory.strict_family_label = "";

  if (hasPriorConversation) {
    args.strictMemory.commercial_welcome_sent = false;
    return args.buildGreetingReply(args.knownCustomerName, args.strictMemory);
  }

  args.strictMemory.commercial_welcome_sent = true;
  return args.buildCommercialWelcomeMessage();
}
