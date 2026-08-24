'use client'

import Link from 'next/link'
import { useAction } from '@/lib/hooks/use-action'
import { generateAgreement, sendAgreementLink } from './actions'
import type { RosterTraveller } from './manifest-client'

function travellerName(traveller: RosterTraveller) {
  return `${traveller.firstName ?? ''} ${traveller.lastName ?? ''}`.trim() || '(unnamed traveller)'
}

function AgreementStatus({ traveller }: { traveller: RosterTraveller }) {
  if (!traveller.agreement) return <span className="text-xs text-muted-foreground">Not issued</span>
  if (traveller.agreement.status === 'signed') {
    return (
      <span className="text-xs font-medium text-green-600">
        ✓ Signed
        {traveller.agreement.signedAt
          ? ` · ${new Date(traveller.agreement.signedAt).toLocaleDateString('en-GB')}`
          : ''}
      </span>
    )
  }
  return <span className="text-xs font-medium text-amber-600">Awaiting signature</span>
}

export default function AgreementsPanel({
  departureId,
  roster,
  hasTemplate,
  copied,
  onCopy,
  onError,
}: {
  departureId: string
  roster: RosterTraveller[]
  hasTemplate: boolean
  copied: string | null
  onCopy: (token: string) => void
  onError: (msg: string) => void
}) {
  const signed = roster.filter(traveller => traveller.agreement?.status === 'signed').length
  const pending = roster.filter(
    traveller => traveller.agreement && traveller.agreement.status !== 'signed',
  ).length
  const notIssued = roster.length - signed - pending

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Signed</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{signed}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Awaiting signature</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{pending}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Not issued</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{notIssued}</p>
        </div>
      </div>

      {!hasTemplate && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Create an active template before issuing traveller agreements.</span>
          <Link href="/admin/agreements" className="font-medium underline underline-offset-2">
            Set up template
          </Link>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Agreement register</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Issue documents, email signing links and open signed PDFs.
            </p>
          </div>
          <Link href="/admin/agreements" className="text-xs font-medium text-brand-text hover:underline">
            Edit agreement template
          </Link>
        </div>
        <table className="stack-table w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Traveller</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roster.map(traveller => (
              <AgreementRow
                key={traveller.id}
                departureId={departureId}
                traveller={traveller}
                hasTemplate={hasTemplate}
                copied={copied}
                onCopy={onCopy}
                onError={onError}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AgreementRow({
  departureId,
  traveller,
  hasTemplate,
  copied,
  onCopy,
  onError,
}: {
  departureId: string
  traveller: RosterTraveller
  hasTemplate: boolean
  copied: string | null
  onCopy: (token: string) => void
  onError: (msg: string) => void
}) {
  const { pending, run } = useAction()

  function act(action: typeof generateAgreement | typeof sendAgreementLink) {
    const formData = new FormData()
    formData.set('departureId', departureId)
    formData.set('travellerId', traveller.id)
    onError('')
    run(async () => {
      try {
        await action(formData)
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Action failed.')
      }
    })
  }

  return (
    <tr className="border-b border-border/70 align-top last:border-0 hover:bg-muted/40">
      <td data-label="Traveller" className="px-4 py-3">
        <span className="font-medium text-foreground">{travellerName(traveller)}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{traveller.partyName}</span>
      </td>
      <td data-label="Contact" className="px-4 py-3 text-xs text-muted-foreground">
        {traveller.email ?? 'No email on file'}
      </td>
      <td data-label="Status" className="px-4 py-3">
        <AgreementStatus traveller={traveller} />
      </td>
      <td data-label="Actions" className="px-4 py-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {hasTemplate && traveller.agreement?.status !== 'signed' && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(generateAgreement)}
              className="font-medium text-brand-text hover:underline disabled:opacity-50"
            >
              {traveller.agreement ? 'Re-issue' : 'Issue'}
            </button>
          )}
          {traveller.agreement?.status !== 'signed' && traveller.agreement && traveller.email && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(sendAgreementLink)}
              className="font-medium text-brand-text hover:underline disabled:opacity-50"
            >
              Email link
            </button>
          )}
          {traveller.agreement?.token && (
            <button
              type="button"
              onClick={() => onCopy(traveller.agreement!.token!)}
              className="font-medium text-brand-text hover:underline"
            >
              {copied === traveller.agreement.token ? 'Copied!' : 'Copy link'}
            </button>
          )}
          {traveller.agreement?.status === 'signed' && traveller.agreement.token && (
            <a
              href={`/agreement/${traveller.agreement.token}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-text hover:underline"
            >
              Open PDF
            </a>
          )}
        </div>
      </td>
    </tr>
  )
}
