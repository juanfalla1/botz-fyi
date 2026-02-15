import { redirect } from "next/navigation";

// Deprecated route: keep for backward compatibility.
// The product entrypoint lives under /start.
export default function DashboardRedirect() {
  redirect("/start?tab=crm");
}
