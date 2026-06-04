import { redirect } from "next/navigation"

export default function DeprecatedAuditDemoPage() {
  redirect("/geo/app/audits")
}
