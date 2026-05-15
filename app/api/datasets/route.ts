import { listDatasets } from "@/app/api/_intelligence/shared";

export async function GET() {
  return listDatasets();
}
