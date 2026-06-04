export type Priority = "high" | "medium" | "low";
export type RecommendationType = "content" | "technical" | "entity" | "structured_data" | "authority";
export type RecommendationStatus = "pending" | "in_progress" | "completed";
export type AuditStatus = "pending" | "crawling" | "analyzing" | "scoring" | "completed" | "failed";
export type AiEngine = "openai" | "gemini" | "perplexity";

export interface GeoProject {
  id: string;
  companyName: string;
  websiteUrl: string;
  country: string;
  language: string;
  industry: string;
  businessGoal: string;
  competitors: string[];
}

export interface GeoScore {
  aiVisibilityScore: number;
  citationProbability: number;
  brandMentionScore: number;
  competitorDominanceScore: number;
  contentClarityScore: number;
  entityConsistencyScore: number;
  structuredDataScore: number;
  topicalAuthorityScore: number;
  freshnessScore: number;
  trustSignalScore: number;
  finalScore: number;
}

export interface GeoRecommendation {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  type: RecommendationType;
  suggestedAction: string;
  status: RecommendationStatus;
}

export interface ContentOpportunity {
  id: string;
  title: string;
  targetPrompt: string;
  intent: string;
  engine: AiEngine;
  recommendedFormat: string;
  priority: Priority;
  brief: string;
}
