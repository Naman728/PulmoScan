/**
 * Build probability distribution for display when API returns single prediction + confidence.
 * Shows primary diagnosis at confidence%, then "Other" for the rest (split for visual variety).
 */
export function buildProbabilityItems(prediction, confidencePct) {
  const pct = Math.min(100, Math.max(0, Number(confidencePct || 0)));
  const primary = String(prediction || 'Diagnosis').trim() || 'Result';
  const other = 100 - pct;
  const items = [
    { label: primary, value: pct, color: 'bg-sky-500' },
  ];
  if (other > 0) {
    items.push({ label: 'Other', value: other, color: 'bg-slate-600' });
  }
  return items;
}

/**
 * Build top-3 predictions from API conditions (X-ray) or single prediction + confidence.
 * conditions: [{ label, probability, status }] — sorted by probability desc, take top 3.
 */
export function buildTop3Predictions(conditions, fallbackPrediction, fallbackConfidencePct) {
  if (Array.isArray(conditions) && conditions.length > 0) {
    const sorted = [...conditions]
      .filter((c) => c.label && typeof c.probability === 'number')
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);
    return sorted.map((c) => ({
      label: c.label,
      value: Math.round(c.probability * 100),
      probability: c.probability,
      status: c.status,
    }));
  }
  if (fallbackPrediction && (fallbackConfidencePct != null || fallbackConfidencePct === 0)) {
    const pct = Math.min(100, Math.max(0, Number(fallbackConfidencePct || 0)));
    return [{ label: String(fallbackPrediction).trim() || 'Result', value: pct, probability: pct / 100, status: null }];
  }
  return [];
}

/**
 * Probability distribution items from conditions (for bar chart).
 */
export function buildProbabilityItemsFromConditions(conditions) {
  if (!Array.isArray(conditions) || conditions.length === 0) return [];
  return conditions
    .filter((c) => c.label)
    .map((c) => ({
      label: c.label,
      value: Math.round((c.probability || 0) * 100),
      color: c.status === 'Detected' ? 'bg-amber-500' : 'bg-slate-600',
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Generate short AI insight text from prediction and confidence.
 * Prefer apiExplanation when provided (from backend).
 */
export function getAIInsightText(prediction, confidencePct, apiExplanation = null) {
  if (apiExplanation && typeof apiExplanation === 'string' && apiExplanation.trim()) {
    return apiExplanation.trim();
  }
  const pct = Math.round(Number(confidencePct || 0));
  const diagnosis = String(prediction || 'imaging findings').trim();
  if (pct >= 70) {
    return `AI detected patterns consistent with ${diagnosis}. Confidence is high. Further clinical validation is recommended.`;
  }
  if (pct >= 40) {
    return `AI identified features suggestive of ${diagnosis}. Confidence is moderate. Further evaluation or follow-up may be indicated.`;
  }
  return `The model reported ${diagnosis} with moderate uncertainty. Clinical correlation and additional imaging or tests are recommended.`;
}
