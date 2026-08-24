'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { addTask, toggleTask, deleteTask } from './task-actions'

interface Task {
  id: string
  title: string
  is_done: boolean
  created_at: string
  type?: string
  auto_generated?: boolean
  sort_order?: number
  priority?: string
  due_date?: string | null
}

type TaskManagerProps = {
  requestId?: string
  departureId?: string
  bookingId?: string
  tasks: Task[]
  title?: string
  readOnly?: boolean
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

function TypeChip({ type }: { type?: string }) {
  if (!type || type === 'other') return null
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${TYPE_CHIP[type] ?? TYPE_CHIP.other}`}>{type}</span>
}

function TaskMeta({ task }: { task: Task }) {
  const overdue = Boolean(task.due_date) && !task.is_done && task.due_date! < new Date().toISOString().slice(0, 10)
  return (
    <span className="flex items-center gap-1.5 text-[10px]">
      {task.priority && task.priority !== 'normal' ? <span className={`rounded-full px-1.5 py-0.5 font-semibold uppercase ${task.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{task.priority}</span> : null}
      {task.due_date ? <span className={overdue ? 'font-semibold text-red-700' : 'text-muted-foreground'}>Due {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en-GB')}</span> : null}
    </span>
  )
}

export default function TaskManager({
  requestId,
  departureId,
  bookingId,
  tasks: initial,
  title: heading = 'Tasks',
  readOnly = false,
}: TaskManagerProps) {
  const [tasks, setTasks] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('other')
  const [priority, setPriority] = useState('normal')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')
  const { pending, run } = useAction()

  function appendContext(fd: FormData) {
    if (requestId) fd.set('requestId', requestId)
    if (departureId) fd.set('departureId', departureId)
    if (bookingId) fd.set('bookingId', bookingId)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError('')
    const fd = new FormData()
    appendContext(fd)
    fd.set('title', title)
    fd.set('type', type)
    fd.set('priority', priority)
    if (dueDate) fd.set('dueDate', dueDate)
    run(async () => {
      try {
        const created = await addTask(fd)
        if (created) setTasks(ts => [...ts, created as Task])
        setTitle('')
        setType('other')
        setPriority('normal')
        setDueDate('')
        setShowAdd(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add task.')
      }
    })
  }

  function handleToggle(task: Task) {
    const fd = new FormData()
    fd.set('taskId', task.id)
    appendContext(fd)
    fd.set('isDone', String(!task.is_done))
    run(async () => {
      await toggleTask(fd)
      setTasks(ts => ts.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
    })
  }

  function handleDelete(taskId: string) {
    const fd = new FormData()
    fd.set('taskId', taskId)
    appendContext(fd)
    run(async () => {
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
          {heading}
          {open.length > 0 && (
            <span className="ml-2 text-xs bg-amber-100 text-warning-foreground px-2 py-0.5 rounded-full">
              {open.length} open
            </span>
          )}
        </h2>
        {!readOnly && !showAdd && (
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
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="other">General</option>
            <option value="payment">Payment</option>
            <option value="accommodation">Accommodation</option>
            <option value="activity">Activity</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground">
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent</option>
              <option value="low">Low priority</option>
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full rounded-md border border-border px-3 py-1.5 text-sm text-foreground" aria-label="Due date" />
          </div>
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
                onClick={readOnly ? undefined : () => handleToggle(task)}
                disabled={pending || readOnly}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-border hover:border-primary-strong transition disabled:cursor-default"
                aria-label={readOnly ? 'Open task' : 'Mark done'}
              />
              <span className="flex-1 text-sm text-foreground">
                <span className="flex items-center gap-1.5 flex-wrap">{task.title}<TypeChip type={task.type} />{task.auto_generated ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-warning-foreground border border-amber-200">auto</span> : null}</span>
                <TaskMeta task={task} />
              </span>
              {!readOnly && <button
                type="button"
                onClick={() => handleDelete(task.id)}
                disabled={pending}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs shrink-0"
                aria-label="Delete task"
              >
                ✕
              </button>}
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
                onClick={readOnly ? undefined : () => handleToggle(task)}
                disabled={pending || readOnly}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-primary-strong bg-[var(--olive)] flex items-center justify-center transition"
                aria-label="Mark undone"
              >
                <span className="text-white text-[9px] leading-none">✓</span>
              </button>
              <span className="flex-1 text-sm text-muted-foreground line-through">{task.title}<TaskMeta task={task} /></span>
              {!readOnly && <button
                type="button"
                onClick={() => handleDelete(task.id)}
                disabled={pending}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs shrink-0"
                aria-label="Delete task"
              >
                ✕
              </button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
