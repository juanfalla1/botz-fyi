import { handleWebhookTurn } from "../core";

export async function handleConversationEngineTurn(req: Request) {
  return handleWebhookTurn(req);
}

export const POST = handleConversationEngineTurn;
