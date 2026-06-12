import { AppSidebar } from "@/GEO/components/geo/app-shell"

export default function GeoAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppSidebar />
      <main className="ml-64 min-h-screen w-[calc(100%-16rem)] max-w-[calc(100%-16rem)] overflow-x-hidden transition-all duration-300">{children}</main>
    </div>
  )
}
