import { WifiOff } from 'lucide-react'
import RetryButton from './offline-actions'

export const metadata = { title: 'Offline' }

export default function OfflinePage() {
  return (
    <main className="admin-theme flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 pt-safe text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-brand-ink">
        <WifiOff size={28} aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">You&apos;re offline</h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          This screen needs a connection. Check your network and try again —
          pages you&apos;ve already opened still work offline.
        </p>
      </div>
      <RetryButton />
    </main>
  )
}
