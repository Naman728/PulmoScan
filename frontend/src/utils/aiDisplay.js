/**
 * Build probability distribution for display when API returns single prediction + confidence.
 * Shows primary diagnosis at confidence%, then "Other" for the rest (split for visual variety).
 */
export function buildProbabilityItems(prediction, confidencePct) {
  const pct = Math.min(100, Math.max(0, Number(confidencePct) ?? 0));
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
 * Generate short AI insight text from prediction and confidence.
 */
export function getAIInsightText(prediction, confidencePct) {
  const pct = Math.round(Number(confidencePct) ?? 0);
  const diagnosis = String(prediction || 'imaging findings').trim();
  if (pct >= 70) {
    return `The model detected patterns associated with ${diagnosis} with high confidence. Consider correlation with clinical presentation.`;
  }
  if (pct >= 40) {
    return `The model identified features suggestive of ${diagnosis}. Further evaluation or follow-up may be indicated.`;
  }
  return `The model reported ${diagnosis} with moderate uncertainty. Clinical correlation and additional imaging or tests are recommended.`;
}
