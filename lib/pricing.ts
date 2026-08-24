export interface LineTotals {
  totalCostUsd: number
  totalSellingUsd: number
}

// Shared cost/markup math for quote price lines. Used by both the
// per-line actions and bulk markup updates so the formula only lives once.
export function calculateLineTotals(quantity: number, unitCostUsd: number, markupPercent: number): LineTotals {
  const totalCostUsd = quantity * unitCostUsd
  const totalSellingUsd = totalCostUsd * (1 + markupPercent / 100)
  return { totalCostUsd, totalSellingUsd }
}

/** Keep database-derived line totals equal to the operator-entered package sale. */
export function reconcileSellingTotal<T extends LineTotals>(
  lines: T[],
  targetSellingUsd: number,
  zeroCostFallback: T,
): T[] {
  const target = Math.round(targetSellingUsd * 100) / 100
  const current = Math.round(lines.reduce((sum, line) => sum + line.totalSellingUsd, 0) * 100) / 100

  if (target <= 0 || current === target) return lines
  if (current <= 0) return [...lines, { ...zeroCostFallback, totalSellingUsd: target }]

  const lastIndex = lines.length - 1
  return lines.map((line, index) => index === lastIndex
    ? { ...line, totalSellingUsd: Math.round((line.totalSellingUsd + target - current) * 100) / 100 }
    : line)
}

export function proposalPricingErrorMessage(message: string): string {
  const messages: Record<string, string> = {
    PRICING_POSITIVE_SALE_REQUIRED: 'Enter a selling price greater than $0 in Cost summary & sale price, then save again.',
    PRICING_DATES_REQUIRED: 'Add the trip start and end dates before saving pricing.',
    PRICING_ITINERARY_REQUIRED: 'Add at least one itinerary day before saving pricing.',
    PRICING_PAYING_TRAVELLER_REQUIRED: 'Add at least one paying traveller before saving pricing.',
    PRICING_VERSION_LOCKED: 'This proposal version is already sent or locked. Create a new version to change its pricing.',
    PRICING_VERSION_NOT_FOUND: 'The proposal version could not be found. Refresh the page and try again.',
    PRICING_SAVE_RESULT_INVALID: 'The proposal could not be saved. Refresh the page and try again.',
  }
  const code = Object.keys(messages).find(key => message.includes(key))
  return code ? messages[code] : message
}
