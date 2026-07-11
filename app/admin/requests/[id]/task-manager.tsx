'use client'

import { useState, useTransition } from 'react'
import { addTask, toggleTask, deleteTask } from './task-actions'

interface Task {
  id: string
  title: string
  is_done: boolean
  created_at: string
  type?: string
  auto_generated?: boolean
  sort_order?: number
}

const TYPE_CHIP: Record<string, string> = {
  payment: 'bg-emerald-100 text-emerald-700',
  accommodation: 'bg-blue-100 text-blue-700',
  activity: 'bg-violet-100 text-violet-700',
  other: 'bg-muted text-muted-foreground',
}

function orderTasks(list: Task[]) {
  return [...list].sort((a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    a.created_at.localeCompare(b.created_at))
}

export default function TaskManager({ requestId, tasks: initial }: { requestId: string; tasks: Task[] }) {
  const [tasks, setTasks] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('other')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError('')
    const fd = new FormData()
    fd.set('requestId', requestId)
    fd.set('title', title)
    fd.set('type', type)
    startTransition(async () => {
      try {
        await addTask(fd)
        setTitle('')
        setType('other')
        setShowAdd(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add task.')
      }
    })
  }

  function TypeChip({ t }: { t?: string }) {
    if (!t || t === 'other') return null
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${TYPE_CHIP[t] ?? TYPE_CHIP.other}`}>{t}</span>
  }

  function handleToggle(task: Task) {
    const fd = new FormData()
    fd.set('taskId', task.id)
    fd.set('requestId', requestId)
    fd.set('isDone', String(!task.is_done))
    startTransition(async () => {
      await toggleTask(fd)
      setTasks(ts => ts.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
    })
  }

  function handleDelete(taskId: string) {
    const fd = new FormData()
    fd.set('taskId', taskId)
    fd.set('requestId', requestId)
    startTransition(async () => {
      await deleteTask(fd)
      setTasks(ts => ts.filter(t => t.id !== taskId))
    })
  }

  const open = orderTasks(tasks.filter(t => !t.is_done))
  const done = orderTasks(tasks.filter(t => t.is_done))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Tasks
          {open.length > 0 && (
            <span className="ml-2 text-xs bg-amber-100 text-warning-foreground px-2 py-0.5 rounded-full">
              {open.length} open
            </span>
          )}
        </h2>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setError('') }}
            className="text-xs text-brand-text hover:text-brand-ink font-medium"
          >
            + Add Task
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-3 space-y-2">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task description…"
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
          />
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
          >
            <option value="other">General</option>
            <option value="payment">Payment</option>
            <option value="accommodation">Accommodation</option>
            <option value="activity">Activity</option>
          </select>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || !title.trim()}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk"
            >
              {pending ? 'Saving…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setTitle(''); setError('') }}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {tasks.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground">No tasks yet.</p>
      )}

      {open.length > 0 && (
        <ul className="space-y-1.5 mb-2">
          {open.map(task => (
            <li key={task.id} className="flex items-start gap-2 group">
              <button
                type="button"
                onClick={() => handleToggle(task)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-border hover:border-primary-strong transition"
                aria-label="Mark done"
              />
              <span className="flex-1 text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                {task.title}
                <TypeChip t={task.type} />
                {task.auto_generated && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">auto</span>}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                disabled={pending}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs shrink-0"
                aria-label="Delete task"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <ul className="space-y-1 border-t border-border/70 pt-2 mt-1">
          {done.map(task => (
            <li key={task.id} className="flex items-start gap-2 group">
              <button
                type="button"
                onClick={() => handleToggle(task)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-primary-strong bg-[var(--olive)] flex items-center justify-center transition"
                aria-label="Mark undone"
              >
                <span className="text-white text-[9px] leading-none">✓</span>
              </button>
              <span className="flex-1 text-sm text-muted-foreground line-through">{task.title}</span>
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                disabled={pending}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs shrink-0"
                aria-label="Delete task"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
