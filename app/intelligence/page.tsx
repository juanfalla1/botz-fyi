import { MetrocasDashboard } from "@/app/metrocas/ui/MetrocasDashboard";
import { redirect } from "next/navigation";

export default async function IntelligencePage(props: { searchParams: Promise<{ universal_dataset_id?: string }> }) {
  const sp = await props.searchParams;
  const universalDatasetId = String(sp?.universal_dataset_id || "").trim();
  if (universalDatasetId) {
    redirect(`/intelligence/universal/${encodeURIComponent(universalDatasetId)}`);
  }
  return <MetrocasDashboard />;
}
