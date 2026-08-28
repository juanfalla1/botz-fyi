import type { Metadata } from "next";
import GrowthExperience from "./GrowthExperience";

export const metadata: Metadata = {
  title: "BOTZ Growth | Social Growth Automation",
  description:
    "Connect social networks, capture and segment leads, automate follow-up and turn every interaction into measurable growth.",
  alternates: { canonical: "/growth" },
  openGraph: {
    title: "BOTZ Growth | From social signal to business growth",
    description: "Social lead capture, AI segmentation and automatic growth workflows in one connected system.",
    url: "https://www.botz.fyi/growth",
  },
};

export default function GrowthPage() {
  return <GrowthExperience />;
}
