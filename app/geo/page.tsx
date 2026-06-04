import { Navbar } from "@/GEO/components/landing/navbar"
import { HeroSection } from "@/GEO/components/landing/hero-section"
import { ProductSection } from "@/GEO/components/landing/product-section"
import { FeaturesSection } from "@/GEO/components/landing/features-section"
import { HowItWorksSection } from "@/GEO/components/landing/how-it-works-section"
import { DashboardPreviewSection } from "@/GEO/components/landing/dashboard-preview-section"
import { PricingSection } from "@/GEO/components/landing/pricing-section"
import { BlogSection } from "@/GEO/app/landing/blog-section"
import { CTASection } from "@/GEO/components/landing/cta-section"

export default function GeoPage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ProductSection />
      <FeaturesSection />
      <HowItWorksSection />
      <DashboardPreviewSection />
      <PricingSection />
      <BlogSection />
      <CTASection />
    </main>
  )
}
