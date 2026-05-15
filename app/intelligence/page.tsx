import { MetrocasDashboard } from "@/app/metrocas/ui/MetrocasDashboard";
import { UniversalVisualDashboard } from "@/app/intelligence/ui/UniversalVisualDashboard";

export default async function IntelligencePage(props: { searchParams: Promise<{ universal_dataset_id?: string }> }) {
  const sp = await props.searchParams;
  const universalDatasetId = String(sp?.universal_dataset_id || "").trim();
  if (universalDatasetId) return <UniversalVisualDashboard datasetId={universalDatasetId} />;
  return <MetrocasDashboard />;
}
