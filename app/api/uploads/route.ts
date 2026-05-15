import { handleUpload } from "@/app/api/_intelligence/shared";

export async function POST(req: Request) {
  return handleUpload(req);
}
