/**
 * Format confidence/percentage for display. Max 2 decimal places.
 * @param {number|string} value - Raw value (0-100 or 0-1)
 * @param {boolean} isDecimal - If true, value is 0-1; if false, 0-100
 * @returns {string} e.g. "85.09%"
 */
export function formatConfidence(value, isDecimal = false) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0%';
  const pct = isDecimal ? num * 100 : num;
  const rounded = Math.round(pct * 100) / 100;
  return `${rounded}%`;
}

/**
 * Format confidence for use in progress bars (0-100 number).
 */
export function formatConfidenceNumber(value, isDecimal = false) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return isDecimal ? Math.round(num * 10000) / 100 : Math.round(num * 100) / 100;
}
