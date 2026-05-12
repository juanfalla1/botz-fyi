import { redirect } from "next/navigation";

export default async function MetrocasIntelligencePage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const datasetId = Array.isArray(searchParams?.dataset_id) ? searchParams.dataset_id[0] : searchParams?.dataset_id;
  redirect(datasetId ? `/intelligence?dataset_id=${encodeURIComponent(datasetId)}` : "/intelligence");
}
