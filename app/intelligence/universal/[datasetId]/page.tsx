import { UniversalVisualDashboard } from "@/app/intelligence/ui/UniversalVisualDashboard";

type PageProps = {
  params: Promise<{ datasetId: string }>;
};

export default async function UniversalDatasetDashboardPage(props: PageProps) {
  const p = await props.params;
  const datasetId = String(p?.datasetId || "").trim();
  return <UniversalVisualDashboard datasetId={datasetId} />;
}
