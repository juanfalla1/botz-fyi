export function computeGeoScore(seed = 69) {
  return {
    ai_visibility_score: seed + 3,
    citation_probability: seed - 5,
    brand_mention_score: seed - 11,
    competitor_dominance_score: seed - 22,
    content_clarity_score: seed + 10,
    entity_consistency_score: seed - 1,
    structured_data_score: seed - 6,
    topical_authority_score: seed + 5,
    freshness_score: seed - 13,
    trust_signal_score: seed + 1,
    final_score: seed,
    explanation: "Demo GEO score calculated from synthetic signals.",
  };
}
