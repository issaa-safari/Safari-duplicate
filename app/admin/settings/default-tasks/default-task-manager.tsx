'use client'

import { useState, useTransition } from 'react'
import { addDefaultTask, toggleDefaultTask, deleteDefaultTask } from './actions'

interface DefaultTask {
  id: string
  description: string
  type: string
  sort_order: number
  is_active: boolean
}

const TYPE_CHIP: Record<string, string> = {
  payment: 'bg-emerald-100 text-emerald-700',
  accommodation: 'bg-blue-100 text-blue-700',
  activity: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-500',
}

export default function DefaultTaskManager({ tasks: initial }: { tasks: DefaultTask[] }) {
  const [tasks, setTasks] = useState(initial)
  const [description, setDescription] = useState('')
  const [type, setType] = useState('other')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function refresh(mutate: (t: DefaultTask[]) => DefaultTask[]) {
    setTasks(mutate)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setError('')
    const fd = new FormData()
    fd.set('description', description)
    fd.set('type', type)
    startTransition(async () => {
      try {
        await addDefaultTask(fd)
        setTasks(ts => [...ts, { id: crypto.randomUUID(), description, type, sort_order: (ts.at(-1)?.sort_order ?? 0) + 10, is_active: true }])
        setDescription('')
        setType('other')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add.')
      }
    })
  }

  function handleToggle(t: DefaultTask) {
    const fd = new FormData()
    fd.set('id', t.id)
    fd.set('isActive', String(!t.is_active))
    startTransition(async () => {
      await toggleDefaultTask(fd)
      refresh(ts => ts.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))
    })
  }

  function handleDelete(id: string) {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await deleteDefaultTask(fd)
      refresh(ts => ts.filter(x => x.id !== id))
    })
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        These tasks are generated automatically on every request the moment it becomes
        <span className="font-medium text-gray-700"> Booked</span>, alongside a payment
        task and one task per accommodation in the itinerary.
      </p>

      <ul className="space-y-1.5 mb-4">
        {tasks.length === 0 && <li className="text-xs text-gray-400">No default tasks yet.</li>}
        {tasks.map(t => (
          <li key={t.id} className="flex items-center gap-2 group">
            <button
              type="button"
              onClick={() => handleToggle(t)}
              disabled={pending}
              title={t.is_active ? 'Active — click to disable' : 'Disabled — click to enable'}
              className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition ${
                t.is_active ? 'border-[var(--olive)] bg-[var(--olive)]' : 'border-gray-300'}`}
            >
              {t.is_active && <span className="text-white text-[9px] leading-none">✓</span>}
            </button>
            <span className={`flex-1 text-sm flex items-center gap-1.5 ${t.is_active ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
              {t.description}
              {t.type !== 'other' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${TYPE_CHIP[t.type] ?? TYPE_CHIP.other}`}>{t.type}</span>}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(t.id)}
              disabled={pending}
              className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs shrink-0"
              aria-label="Delete"
            >✕</button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="New default task…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
        />
        <select value={type} onChange={e => setType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]">
          <option value="other">General</option>
          <option value="payment">Payment</option>
          <option value="accommodation">Accommodation</option>
          <option value="activity">Activity</option>
        </select>
        <button type="submit" disabled={pending || !description.trim()}
          className="rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
          {pending ? 'Saving…' : 'Add'}
        </button>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
