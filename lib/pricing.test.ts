import { describe, expect, it } from 'vitest'
import { calculateLineTotals, proposalPricingErrorMessage, reconcileSellingTotal } from './pricing'

describe('calculateLineTotals', () => {
  it('computes cost as quantity times unit cost', () => {
    const { totalCostUsd } = calculateLineTotals(3, 100, 0)
    expect(totalCostUsd).toBe(300)
  })

  it('applies the markup percentage on top of cost', () => {
    const { totalSellingUsd } = calculateLineTotals(1, 100, 20)
    expect(totalSellingUsd).toBe(120)
  })

  it('returns selling price equal to cost when markup is zero', () => {
    const { totalCostUsd, totalSellingUsd } = calculateLineTotals(4, 50, 0)
    expect(totalSellingUsd).toBe(totalCostUsd)
  })

  it('handles fractional quantities (e.g. half-day pricing units)', () => {
    const { totalCostUsd, totalSellingUsd } = calculateLineTotals(0.5, 200, 10)
    expect(totalCostUsd).toBe(100)
    expect(totalSellingUsd).toBeCloseTo(110, 10)
  })

  it('handles zero unit cost (e.g. complimentary line items)', () => {
    const { totalCostUsd, totalSellingUsd } = calculateLineTotals(2, 0, 50)
    expect(totalCostUsd).toBe(0)
    expect(totalSellingUsd).toBe(0)
  })

  it('compounds large quantity, cost, and markup correctly', () => {
    const { totalCostUsd, totalSellingUsd } = calculateLineTotals(12, 150.5, 35)
    expect(totalCostUsd).toBeCloseTo(1806, 10)
    expect(totalSellingUsd).toBeCloseTo(2438.1, 10)
  })
})

describe('reconcileSellingTotal', () => {
  it('preserves a package sale when all priced costs are zero', () => {
    const fallback = { totalCostUsd: 0, totalSellingUsd: 0, description: 'Package selling price' }
    const result = reconcileSellingTotal([], 2400, fallback)
    expect(result).toEqual([{ ...fallback, totalSellingUsd: 2400 }])
  })

  it('absorbs rounding differences into the final line', () => {
    const result = reconcileSellingTotal([
      { totalCostUsd: 10, totalSellingUsd: 33.33 },
      { totalCostUsd: 20, totalSellingUsd: 66.66 },
    ], 100, { totalCostUsd: 0, totalSellingUsd: 0 })
    expect(result.reduce((sum, line) => sum + line.totalSellingUsd, 0)).toBe(100)
  })
})

describe('proposalPricingErrorMessage', () => {
  it('turns database validation codes into actionable copy', () => {
    expect(proposalPricingErrorMessage('PRICING_POSITIVE_SALE_REQUIRED')).toContain('greater than $0')
  })
})
