import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { ProductSection } from "@/components/landing/product-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { DashboardPreviewSection } from "@/components/landing/dashboard-preview-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { BlogSection } from "@/components/landing/blog-section"
import { CTASection } from "@/components/landing/cta-section"

export default function Page() {
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
