import { uploadStatus } from "@/app/api/_intelligence/shared";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return uploadStatus(id);
}
