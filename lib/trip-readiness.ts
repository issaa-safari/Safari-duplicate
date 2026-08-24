export type TripReadinessInput = {
  travellers: number
  passports: number
  arrivals: number
  riders: number
  bikes: number
  agreements: number
  tasks: number
  openTasks: number
  vouchers: number
  confirmedVouchers: number
  bookingValueUsd: number
  paidUsd: number
}

export type TripReadinessResult = {
  score: number
  label: 'Not started' | 'At risk' | 'In progress' | 'Nearly ready' | 'Ready'
  blockers: string[]
}

function ratio(done: number, total: number, emptyIsComplete = false) {
  if (total <= 0) return emptyIsComplete ? 1 : 0
  return Math.max(0, Math.min(1, done / total))
}

export function calculateTripReadiness(input: TripReadinessInput): TripReadinessResult {
  if (input.travellers <= 0) {
    return { score: 0, label: 'Not started', blockers: ['No travellers booked'] }
  }

  const paymentRatio = input.bookingValueUsd > 0
    ? ratio(input.paidUsd, input.bookingValueUsd)
    : 0
  const taskRatio = input.tasks > 0
    ? ratio(input.tasks - input.openTasks, input.tasks)
    : 1
  const voucherRatio = input.vouchers > 0
    ? ratio(input.confirmedVouchers, input.vouchers)
    : 0

  const score = Math.round(100 * (
    ratio(input.passports, input.travellers) * 0.20
    + ratio(input.arrivals, input.travellers) * 0.15
    + ratio(input.bikes, input.riders, true) * 0.15
    + ratio(input.agreements, input.travellers) * 0.15
    + taskRatio * 0.15
    + voucherRatio * 0.10
    + paymentRatio * 0.10
  ))

  const blockers: string[] = []
  if (input.passports < input.travellers) blockers.push(`${input.travellers - input.passports} passport${input.travellers - input.passports === 1 ? '' : 's'} missing`)
  if (input.arrivals < input.travellers) blockers.push(`${input.travellers - input.arrivals} arrival${input.travellers - input.arrivals === 1 ? '' : 's'} missing`)
  if (input.bikes < input.riders) blockers.push(`${input.riders - input.bikes} bike assignment${input.riders - input.bikes === 1 ? '' : 's'} missing`)
  if (input.agreements < input.travellers) blockers.push(`${input.travellers - input.agreements} agreement${input.travellers - input.agreements === 1 ? '' : 's'} unsigned`)
  if (input.openTasks > 0) blockers.push(`${input.openTasks} open task${input.openTasks === 1 ? '' : 's'}`)
  if (input.vouchers === 0) blockers.push('No supplier vouchers prepared')
  else if (input.confirmedVouchers < input.vouchers) blockers.push(`${input.vouchers - input.confirmedVouchers} voucher${input.vouchers - input.confirmedVouchers === 1 ? '' : 's'} unconfirmed`)
  if (input.bookingValueUsd <= 0) blockers.push('Booking value missing')
  else if (input.paidUsd < input.bookingValueUsd) blockers.push('Payment balance outstanding')

  const label = score === 100
    ? 'Ready'
    : score >= 85
      ? 'Nearly ready'
      : score >= 50
        ? 'In progress'
        : 'At risk'

  return { score, label, blockers }
}
