import { redirect } from "next/navigation"

export default async function LegacyAuditDetailPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string | string[] }>
}) {
  const params = await searchParams
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id
  redirect(id ? `/geo/app/audits/${id}` : "/geo/app/audits")
}
