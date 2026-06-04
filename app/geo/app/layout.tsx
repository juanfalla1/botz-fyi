import { AppSidebar } from "@/GEO/components/geo/app-shell"

export default function GeoAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-64 transition-all duration-300">{children}</main>
    </div>
  )
}
