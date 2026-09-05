import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IndustryExperience from "./IndustryExperience";
import { industries, industrySlugs } from "./industryData";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return industrySlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = industries[slug];
  if (!industry) return {};
  const content = industry.copy.es;
  return {
    title: `${content.eyebrow.replace("BOTZ PARA ", "")} | BOTZ`,
    description: content.intro,
    alternates: { canonical: `/industrias/${slug}` },
    openGraph: {
      title: content.title,
      description: content.intro,
      url: `https://www.botz.fyi/industrias/${slug}`,
      images: [{ url: industry.image }],
    },
  };
}

export default async function IndustryPage({ params }: Props) {
  const { slug } = await params;
  const industry = industries[slug];
  if (!industry) notFound();
  return <IndustryExperience industry={industry} />;
}
