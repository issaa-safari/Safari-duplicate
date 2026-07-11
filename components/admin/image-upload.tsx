'use client'

import { useRef, useState } from 'react'

const G = '#7A9A4A'

async function uploadFile(file: File, folder: string): Promise<string> {
  const fd = new FormData()
  fd.set('file', file)
  fd.set('folder', folder)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Upload failed')
  return json.url as string
}

function DropZone({
  onFiles, busy, multiple, label,
}: {
  onFiles: (files: File[]) => void
  busy: boolean
  multiple?: boolean
  label: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false)
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
        if (files.length) onFiles(multiple ? files : [files[0]])
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition ${
        over ? 'border-[#7A9A4A] bg-green-50' : 'border-border hover:border-gray-400 bg-surface-alt'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(multiple ? files : [files[0]])
          e.target.value = ''
        }}
      />
      {busy ? (
        <span className="text-muted-foreground">Uploading…</span>
      ) : (
        <span className="text-muted-foreground">📷 {label} — drag &amp; drop or click to choose</span>
      )}
    </div>
  )
}

/** Single image (hero, route map, per-day photo). */
export function ImageUpload({
  value, onChange, folder, label = 'Upload image',
}: {
  value: string | null
  onChange: (url: string | null) => void
  folder: string
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handle(files: File[]) {
    setError(''); setBusy(true)
    try {
      const url = await uploadFile(files[0], folder)
      onChange(url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-32 w-auto rounded-lg border border-border object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/100 text-white text-xs hover:bg-red-600"
            title="Remove"
          >×</button>
        </div>
      ) : (
        <DropZone onFiles={handle} busy={busy} label={label} />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

/** Multiple images (gallery). */
export function GalleryUpload({
  value, onChange, folder,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  folder: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handle(files: File[]) {
    setError(''); setBusy(true)
    try {
      const urls: string[] = []
      for (const f of files) urls.push(await uploadFile(f, folder))
      onChange([...value, ...urls])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((url, i) => (
            <div key={url + i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-full rounded-lg border border-border object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/100 text-white text-xs hover:bg-red-600"
                title="Remove"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <DropZone onFiles={handle} busy={busy} multiple label="Add gallery photos" />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
