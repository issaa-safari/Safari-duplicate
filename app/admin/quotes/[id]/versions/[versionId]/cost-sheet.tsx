'use client'

import { useState, useTransition } from 'react'
import { saveCostSheet, applyCostBaseFromSheet } from './actions'

// pricing_unit prefixes identify cost-sheet rows (never shown to clients)
export const CS_UNITS = {
  accommodation: 'cs_night',
  fees: 'cs_fee',
  transport: 'cs_transport',
  misc: 'cs_misc',
} as const

type CSUnit = typeof CS_UNITS[keyof typeof CS_UNITS]

export interface CostLine {
  id?: string
  description: string
  unitCost: string   // unit_cost_usd (budget / cost per night / cost per trip)
  quantity: string   // nights / count / days
  actual: string     // total_selling_usd — used as "actual" in misc/fees
  unit: CSUnit
}

function newLine(unit: CSUnit): CostLine {
  return { description: '', unitCost: '', quantity: '', actual: '', unit }
}

function lineTotal(l: CostLine, unit: CSUnit): number {
  const uc = parseFloat(l.unitCost) || 0
  const q  = parseFloat(l.quantity)  || 0
  if (unit === CS_UNITS.accommodation || unit === CS_UNITS.transport) {
    return q > 0 ? uc * q : uc   // qty × unit OR just unit cost if no qty
  }
  return uc // fees and misc: budget amount
}

function sectionTotal(lines: CostLine[], unit: CSUnit) {
  return lines.reduce((s, l) => s + lineTotal(l, unit), 0)
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface Props {
  quoteId: string
  versionId: string
  initialLines: CostLine[]
  isLocked: boolean
  currentCostBase: number | null
  currentMarkup: number
}

const SECTION_COLORS = {
  accommodation: { bg: '#7B3F9E', light: '#faf5ff' },
  fees:          { bg: '#C97A1A', light: '#fffbf0' },
  transport:     { bg: '#2A7A5A', light: '#f0fff8' },
  misc:          { bg: '#1A4A8A', light: '#f0f6ff' },
}

const inp = 'w-full bg-transparent border-0 border-b border-gray-200 px-1 py-0.5 text-sm focus:outline-none focus:border-gray-500 placeholder-gray-300'
const th = 'px-3 py-2 text-xs font-bold text-white text-left whitespace-nowrap'
const td = 'px-2 py-1'
const totalRow = 'bg-gray-50 font-semibold text-sm'

type ColField = keyof CostLine | 'total' | 'check' | 'diff' | 'actual'
type Col = { label: string; field: ColField; width?: string }

// IMPORTANT: SectionTable is defined at module scope (not inside CostSheetEditor).
// If it were nested, every keystroke would recreate the component function, and
// React would unmount/remount the <input>, dropping focus after one character.
function SectionTable({
  title, color, cols, rows, unit, setter, isLocked, setDeletedIds,
}: {
  title: string
  color: { bg: string; light: string }
  cols: Col[]
  rows: CostLine[]
  unit: CSUnit
  setter: React.Dispatch<React.SetStateAction<CostLine[]>>
  isLocked: boolean
  setDeletedIds: React.Dispatch<React.SetStateAction<string[]>>
}) {
  const totals = {
    unitCost: rows.reduce((s, r) => s + (parseFloat(r.unitCost) || 0), 0),
    quantity: rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0),
    actual:   rows.reduce((s, r) => s + (parseFloat(r.actual)   || 0), 0),
    total:    sectionTotal(rows, unit),
  }

  function updateRow(idx: number, field: keyof CostLine, value: string) {
    setter(rs => rs.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function removeRow(idx: number) {
    const row = rows[idx]
    if (row.id) setDeletedIds(prev => [...prev, row.id!])
    setter(rs => rs.filter((_, i) => i !== idx))
  }

  function addRow() {
    setter(rs => [...rs, newLine(unit)])
  }

  return (
    <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: color.bg }}>
            <th className={th} style={{ width: '35%' }}>{title}</th>
            {cols.slice(1).map(c => (
              <th key={c.label} className={th} style={{ width: c.width }}>{c.label}</th>
            ))}
            {!isLocked && <th className={th} style={{ width: 32 }} />}
          </tr>
        </thead>
        <tbody style={{ backgroundColor: color.light }}>
          {rows.map((row, i) => {
            const total = lineTotal(row, unit)
            const diff  = (parseFloat(row.actual) || 0) - (parseFloat(row.unitCost) || 0)
            return (
              <tr key={row.id ?? `new-${i}`} className="border-b border-gray-100">
                {cols.map(c => (
                  <td key={c.label} className={td}>
                    {c.field === 'total' ? (
                      <div className="flex items-center gap-1 text-right px-1">
                        <span className="flex-1 font-medium">
                          {total > 0 ? fmt(total) : '0'}
                        </span>
                        {total > 0 && <span className="text-green-600 text-xs">✓</span>}
                      </div>
                    ) : c.field === 'diff' ? (
                      <span className={`px-1 ${diff !== 0 ? (diff > 0 ? 'text-green-700' : 'text-red-600') : 'text-gray-400'}`}>
                        {diff !== 0 ? fmt(diff) : '0.0'}
                      </span>
                    ) : isLocked ? (
                      <span className="px-1 text-gray-700">{row[c.field as keyof CostLine] || '—'}</span>
                    ) : (
                      <input
                        className={inp}
                        type={c.field === 'description' ? 'text' : 'text'}
                        inputMode={c.field === 'description' ? undefined : 'decimal'}
                        placeholder={c.field === 'description' ? 'Description' : '0'}
                        value={row[c.field as keyof CostLine] ?? ''}
                        onChange={e => {
                          const v = e.target.value
                          if (c.field === 'description') {
                            updateRow(i, c.field as keyof CostLine, v)
                          } else {
                            // allow only numbers and a single decimal point
                            if (v === '' || /^\d*\.?\d*$/.test(v)) {
                              updateRow(i, c.field as keyof CostLine, v)
                            }
                          }
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                      />
                    )}
                  </td>
                ))}
                {!isLocked && (
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-gray-300 hover:text-red-500 text-lg leading-none"
                      title="Remove row"
                    >×</button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          {!isLocked && (
            <tr style={{ backgroundColor: color.light }}>
              <td colSpan={cols.length + 1} className="px-3 py-1.5">
                <button
                  type="button"
                  onClick={addRow}
                  className="text-xs font-medium hover:underline"
                  style={{ color: color.bg }}
                >
                  + Add row
                </button>
              </td>
            </tr>
          )}
          <tr className={totalRow} style={{ borderTop: `2px solid ${color.bg}` }}>
            <td className="px-3 py-2 font-bold">Total</td>
            {cols.slice(1).map(c => (
              <td key={c.label} className="px-3 py-2 text-right font-bold">
                {c.field === 'unitCost' ? (totals.unitCost > 0 ? fmt(totals.unitCost) : '') :
                 c.field === 'quantity' ? (totals.quantity > 0 ? totals.quantity : '') :
                 c.field === 'actual'   ? (totals.actual > 0   ? fmt(totals.actual) : fmt(0)) :
                 c.field === 'total'    ? fmt(totals.total) :
                 c.field === 'diff'     ? fmt(totals.actual - totals.unitCost) :
                 ''}
              </td>
            ))}
            {!isLocked && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function CostSheetEditor({
  quoteId, versionId, initialLines, isLocked, currentCostBase, currentMarkup,
}: Props) {
  const toSection = (unit: CSUnit) => initialLines.filter(l => l.unit === unit)

  const [accom,     setAccom]     = useState<CostLine[]>(toSection(CS_UNITS.accommodation).length ? toSection(CS_UNITS.accommodation) : [newLine(CS_UNITS.accommodation)])
  const [fees,      setFees]      = useState<CostLine[]>(toSection(CS_UNITS.fees).length      ? toSection(CS_UNITS.fees)      : [newLine(CS_UNITS.fees)])
  const [transport, setTransport] = useState<CostLine[]>(toSection(CS_UNITS.transport).length ? toSection(CS_UNITS.transport) : [newLine(CS_UNITS.transport)])
  const [misc,      setMisc]      = useState<CostLine[]>(toSection(CS_UNITS.misc).length      ? toSection(CS_UNITS.misc)      : [newLine(CS_UNITS.misc)])

  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [saving, startSave] = useTransition()
  const [applying, startApply] = useTransition()
  const [saved, setSaved] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState('')

  const grandTotal =
    sectionTotal(accom, CS_UNITS.accommodation) +
    sectionTotal(fees, CS_UNITS.fees) +
    sectionTotal(transport, CS_UNITS.transport) +
    sectionTotal(misc, CS_UNITS.misc)

  function handleSave() {
    setError('')
    const allLines = [...accom, ...fees, ...transport, ...misc]
    const fd = new FormData()
    fd.set('versionId', versionId)
    fd.set('quoteId', quoteId)
    fd.set('lines', JSON.stringify(allLines))
    fd.set('deletedIds', JSON.stringify(deletedIds))
    startSave(async () => {
      try {
        await saveCostSheet(fd)
        setDeletedIds([])
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch (e: any) {
        setError(e.message ?? 'Failed to save')
      }
    })
  }

  function handleApply() {
    setError('')
    // Save first so the cost base reflects the latest edits, then apply.
    const allLines = [...accom, ...fees, ...transport, ...misc]
    const saveFd = new FormData()
    saveFd.set('versionId', versionId)
    saveFd.set('quoteId', quoteId)
    saveFd.set('lines', JSON.stringify(allLines))
    saveFd.set('deletedIds', JSON.stringify(deletedIds))

    const applyFd = new FormData()
    applyFd.set('versionId', versionId)
    applyFd.set('quoteId', quoteId)
    applyFd.set('costBase', String(grandTotal))

    startApply(async () => {
      try {
        await saveCostSheet(saveFd)
        setDeletedIds([])
        await applyCostBaseFromSheet(applyFd)
        setApplied(true)
        setTimeout(() => setApplied(false), 2500)
      } catch (e: any) {
        setError(e.message ?? 'Failed to apply')
      }
    })
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Cost Sheet</h2>
        <span className="text-xs text-gray-400">Internal — not shown to clients</span>
      </div>

      {/* ACCOMMODATION */}
      <SectionTable
        title="ACCOMMODATION"
        color={SECTION_COLORS.accommodation}
        unit={CS_UNITS.accommodation}
        rows={accom}
        setter={setAccom}
        isLocked={isLocked}
        setDeletedIds={setDeletedIds}
        cols={[
          { label: 'ACCOMMODATION', field: 'description' },
          { label: 'Unit Cost ($/night)', field: 'unitCost', width: '18%' },
          { label: 'Nights', field: 'quantity', width: '10%' },
          { label: 'Total', field: 'total', width: '14%' },
        ]}
      />

      {/* ENTRY FEES */}
      <SectionTable
        title="ENTRY FEES & ACTIVITIES"
        color={SECTION_COLORS.fees}
        unit={CS_UNITS.fees}
        rows={fees}
        setter={setFees}
        isLocked={isLocked}
        setDeletedIds={setDeletedIds}
        cols={[
          { label: 'ENTRY FEES & ACTIVITIES', field: 'description' },
          { label: 'Budget', field: 'unitCost', width: '16%' },
          { label: 'Actual', field: 'actual', width: '14%' },
          { label: 'Difference', field: 'diff', width: '14%' },
        ]}
      />

      {/* TRANSPORT */}
      <SectionTable
        title="TRANSPORT"
        color={SECTION_COLORS.transport}
        unit={CS_UNITS.transport}
        rows={transport}
        setter={setTransport}
        isLocked={isLocked}
        setDeletedIds={setDeletedIds}
        cols={[
          { label: 'TRANSPORT', field: 'description' },
          { label: 'Count', field: 'quantity', width: '10%' },
          { label: 'Unit Cost', field: 'unitCost', width: '16%' },
          { label: 'Total', field: 'total', width: '14%' },
        ]}
      />

      {/* MISCELLANEOUS */}
      <SectionTable
        title="MISCELLANEOUS"
        color={SECTION_COLORS.misc}
        unit={CS_UNITS.misc}
        rows={misc}
        setter={setMisc}
        isLocked={isLocked}
        setDeletedIds={setDeletedIds}
        cols={[
          { label: 'MISCELLANEOUS', field: 'description' },
          { label: 'Budget', field: 'unitCost', width: '16%' },
          { label: 'Actual', field: 'actual', width: '14%' },
          { label: 'Difference', field: 'diff', width: '14%' },
        ]}
      />

      {/* Grand total + actions */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Grand Total Cost Base</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              ${fmt(grandTotal)} <span className="text-sm font-normal text-gray-400">USD</span>
            </p>
            {currentMarkup > 0 && grandTotal > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                + {currentMarkup}% markup = <span className="font-semibold text-gray-700">${fmt(grandTotal * (1 + currentMarkup / 100))}</span> client price
              </p>
            )}
          </div>

          {!isLocked && (
            <div className="flex flex-col gap-2 items-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || applying}
                className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#7A9A4A' }}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Cost Sheet'}
              </button>
              {grandTotal > 0 && (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying || saving}
                  className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {applying ? 'Applying…' : applied ? '✓ Applied to pricing' : `Apply $${fmt(grandTotal)} as Cost Base`}
                </button>
              )}
            </div>
          )}
        </div>

        {currentCostBase != null && currentCostBase > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Current cost base: <span className="font-medium text-gray-600">${fmt(currentCostBase)}</span>
            {currentMarkup > 0 && ` → client price $${fmt(currentCostBase * (1 + currentMarkup / 100))}`}
          </p>
        )}

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    </div>
  )
}
