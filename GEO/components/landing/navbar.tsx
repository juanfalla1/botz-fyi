"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { locale, setLocale, t } = useGeoI18n()
  const isDemoPage = pathname === "/geo/demo"
  const primaryHref = isDemoPage ? "/geo/agendar-demo" : "/geo/register"
  const primaryLabel = isDemoPage ? (locale === "en" ? "Book demo" : "Agendar demo") : t("createGeoAudit")
  const navLinks = [
    { label: t("navProduct"), href: "#producto" },
    { label: t("navFeatures"), href: "#caracteristicas" },
    { label: t("navHow"), href: "#como-funciona" },
    { label: t("navPricing"), href: "#pricing" },
    { label: t("navBlog"), href: "#blog" },
  ]

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
    >
      <div className="max-w-7xl mx-auto">
        <div className="glass rounded-2xl px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0b1020] border border-border flex items-center justify-center overflow-hidden">
              <Image src="/botz-logo.png" alt="Botz" width={18} height={18} className="object-contain" />
            </div>
            <span className="font-bold text-lg text-foreground">BOTZ GEO</span>
          </Link>

          {/* Desktop nav */}
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
              <Link href="/geo/login">{t("signIn")}</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90" asChild>
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button type="button" onClick={() => setLocale("es")} className={locale === "es" ? "px-2 py-1 text-xs bg-primary/20 text-primary" : "px-2 py-1 text-xs text-muted-foreground"}>ES</button>
              <button type="button" onClick={() => setLocale("en")} className={locale === "en" ? "px-2 py-1 text-xs bg-primary/20 text-primary" : "px-2 py-1 text-xs text-muted-foreground"}>EN</button>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mt-2 glass rounded-2xl p-4"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-border" />
              <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" asChild>
                <Link href="/geo/login">{t("signIn")}</Link>
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90" asChild>
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}
