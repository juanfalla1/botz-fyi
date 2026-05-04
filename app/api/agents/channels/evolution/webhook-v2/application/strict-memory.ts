export function resetStrictContextMemory(args: {
  strictMemory: Record<string, any>;
  previousMemory: any;
  text: string;
}): void {
  const { strictMemory, previousMemory, text } = args;
  const keepCustomerName = String(strictMemory.customer_name || previousMemory?.customer_name || "").trim();
  const keepCustomerPhone = String(strictMemory.customer_phone || previousMemory?.customer_phone || "").trim();
  const keepCustomerEmail = String(strictMemory.customer_email || previousMemory?.customer_email || "").trim();
  Object.keys(strictMemory).forEach((k) => delete strictMemory[k]);
  if (keepCustomerName) strictMemory.customer_name = keepCustomerName;
  if (keepCustomerPhone) strictMemory.customer_phone = keepCustomerPhone;
  if (keepCustomerEmail) strictMemory.customer_email = keepCustomerEmail;
  strictMemory.awaiting_action = "none";
  strictMemory.last_intent = "reset_context";
  strictMemory.last_user_text = text;
  strictMemory.last_user_at = new Date().toISOString();
}

export function resetStaleStrictSelectionState(nextMemory: Record<string, any>): void {
  nextMemory.awaiting_action = "none";
  nextMemory.pending_product_options = [];
  nextMemory.pending_family_options = [];
  nextMemory.strict_model_offset = 0;
  nextMemory.strict_family_label = "";
}

export function resetMemoryForGlobalCatalogAsk(nextMemory: Record<string, any>): void {
  nextMemory.awaiting_action = "none";
  nextMemory.last_category_intent = "";
  nextMemory.strict_family_label = "";
  nextMemory.pending_product_options = [];
  nextMemory.pending_family_options = [];
}
