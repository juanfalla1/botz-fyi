import type { Metadata } from "next";
import Image from "next/image";
import { Inter } from "next/font/google";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  ChevronRight,
  Download,
  Globe2,
  Mail,
  MessageCircle,
  Phone,
  Store,
  TrendingUp,
  Utensils,
} from "lucide-react";
import styles from "./sandra.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Sandra Alvarado | BOTZ Technologies Inc.",
  description: "Digital business card for Sandra Alvarado, Business Transformation & AI at BOTZ Technologies Inc.",
  alternates: { canonical: "/sandra" },
  openGraph: {
    title: "Sandra Alvarado | BOTZ Technologies Inc.",
    description: "Business Transformation & AI",
    url: "https://www.botz.fyi/sandra",
    images: [{ url: "/sandra.png", alt: "Sandra Alvarado" }],
  },
};

const actions = [
  {
    label: "WhatsApp",
    detail: "Chat with me",
    href: "https://wa.me/14374352554",
    icon: MessageCircle,
    className: styles.whatsapp,
    external: true,
  },
  {
    label: "Call",
    detail: "+1 437 435 2554",
    href: "tel:+14374352554",
    icon: Phone,
    className: styles.call,
  },
  {
    label: "Email",
    detail: "sandra@botz.fyi",
    href: "mailto:sandra@botz.fyi",
    icon: Mail,
    className: styles.email,
  },
  {
    label: "Save Contact",
    detail: "Add to your contacts",
    href: "/sandra/sandra-alvarado.vcf",
    icon: Download,
    className: styles.contact,
    download: true,
  },
];

const solutions = [
  {
    name: "BOTZ Agents",
    description: "AI Workforce",
    href: "https://www.botz.fyi/start/agents",
    icon: Bot,
    className: styles.agents,
  },
  {
    name: "RestaurantOS",
    description: "Restaurant AI Platform",
    href: "https://restaurantos.botz.fyi/pricing",
    icon: Utensils,
    className: styles.restaurant,
  },
  {
    name: "BOTZ GEO",
    description: "AI Visibility",
    href: "https://www.botz.fyi/geo",
    icon: BarChart3,
    className: styles.geo,
  },
  {
    name: "BOTZ Growth",
    description: "Social Growth",
    href: "https://www.botz.fyi/growth",
    icon: TrendingUp,
    className: styles.growth,
  },
];

export default function SandraCardPage() {
  return (
    <main className={`${styles.page} ${inter.className}`}>
      <div className={styles.ambientTop} />
      <div className={styles.ambientBottom} />

      <article className={styles.card} aria-label="Sandra Alvarado digital business card">
        <div className={styles.profile}>
          <a className={styles.logoLink} href="https://www.botz.fyi" aria-label="BOTZ Technologies home">
            <Bot aria-hidden="true" size={24} strokeWidth={2.2} />
            <span className={styles.logoWord}>botz</span>
            <small>Technologies Inc.</small>
          </a>

          <div className={styles.photoRing}>
            <Image
              className={styles.photo}
              src="/sandra.png"
              alt="Sandra Alvarado"
              width={192}
              height={192}
              priority
            />
            <span className={styles.status} aria-label="Available" />
          </div>

          <h1>Sandra Alvarado</h1>
          <p className={styles.role}>Business Transformation &amp; AI</p>
          <p className={styles.company}>BOTZ Technologies Inc.</p>
          <div className={styles.rule} />
          <p className={styles.bio}>
            I help small businesses sell more, work smarter and grow by combining technology, automation and AI.
          </p>
        </div>

        <div className={styles.actions} aria-label="Contact Sandra">
          {actions.map(({ label, detail, href, icon: Icon, className, external, download }) => (
            <a
              className={`${styles.action} ${className}`}
              href={href}
              key={label}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              download={download ? "Sandra-Alvarado.vcf" : undefined}
            >
              <span className={styles.actionIcon}><Icon size={18} strokeWidth={2} /></span>
              <span className={styles.actionText}>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
              <ChevronRight className={styles.chevron} size={16} />
            </a>
          ))}
        </div>

        <div className={styles.solutions} aria-labelledby="solutions-title">
          <h2 id="solutions-title">Explore BOTZ Solutions</h2>
          <div className={styles.solutionGrid}>
            {solutions.map(({ name, description, href, icon: Icon, className }) => (
              <a className={`${styles.solution} ${className}`} href={href} key={name} target="_blank" rel="noreferrer">
                <span className={styles.solutionIcon}><Icon size={21} strokeWidth={1.8} /></span>
                <strong>{name}</strong>
                <small>{description}</small>
                <ArrowUpRight className={styles.solutionArrow} size={12} />
              </a>
            ))}
          </div>
        </div>

        <div className={styles.cta}>
          <span className={styles.ctaIcon}><Store size={20} /></span>
          <p>Let&apos;s explore what&apos;s possible for your business.</p>
          <a href="https://wa.me/14374352554?text=Hi%20Sandra,%20I%20would%20like%20to%20learn%20more%20about%20BOTZ." target="_blank" rel="noreferrer">
            Let&apos;s Talk <ArrowUpRight size={14} />
          </a>
        </div>

        <div className={styles.footer}>
          <a href="tel:+14374352554"><Phone size={12} /> +1 (437) 435-2554</a>
          <a href="mailto:sandra@botz.fyi"><Mail size={12} /> sandra@botz.fyi</a>
          <a href="https://www.botz.fyi" target="_blank" rel="noreferrer"><Globe2 size={12} /> www.botz.fyi</a>
        </div>
      </article>
    </main>
  );
}
