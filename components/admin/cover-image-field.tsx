'use client'

// Cover image input for content-library forms: real file upload (drag & drop
// via the shared ImageUpload → /api/admin/upload → Supabase storage) with a
// paste-a-URL fallback for remote images. The value is submitted through a
// hidden `coverImageUrl` field, so the server actions keep reading the same
// form key they always have.

import { useState } from 'react'
import { ImageUpload } from './image-upload'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function CoverImageField({
  initialUrl,
  folder,
  label = 'Cover image',
}: {
  initialUrl?: string | null
  /** Storage folder for uploads, e.g. "accommodations/covers". */
  folder: string
  label?: string
}) {
  const [url, setUrl] = useState(initialUrl ?? '')

  return (
    <div>
      <span className="block text-sm font-medium text-foreground mb-1">{label}</span>
      <input type="hidden" name="coverImageUrl" value={url} />
      <ImageUpload
        value={url || null}
        onChange={u => setUrl(u ?? '')}
        folder={folder}
        label="Upload cover image"
      />
      {!url && (
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="…or paste an image URL (https://…)"
          aria-label={`${label} URL`}
          className={inputCls + ' mt-2'}
        />
      )}
    </div>
  )
}
