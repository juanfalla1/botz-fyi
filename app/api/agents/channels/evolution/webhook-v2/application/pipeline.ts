import { handleWebhookTurn } from "../core";

export async function runWebhookV2Pipeline(req: Request): Promise<Response> {
  return handleWebhookTurn(req);
}
