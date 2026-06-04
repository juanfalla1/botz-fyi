import { redirect } from "next/navigation"

export default async function GeoAuditRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/geo/app/audits/detail?id=${encodeURIComponent(id)}`)
}
