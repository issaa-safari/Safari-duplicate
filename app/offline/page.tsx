export const metadata = { title: 'Offline' }

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold" style={{ color: '#7A9A4A' }}>You&apos;re offline</h1>
      <p className="text-sm text-gray-600 max-w-sm">
        This page isn&apos;t available without a connection. Check your network and try again —
        pages you&apos;ve already opened will still work.
      </p>
    </main>
  )
}
