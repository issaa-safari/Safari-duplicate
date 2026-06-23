'use client'

import { useState, useTransition } from 'react'
import { addTask, toggleTask, deleteTask } from './task-actions'

interface Task {
  id: string
  title: string
  is_done: boolean
  created_at: string
}

export default function TaskManager({ requestId, tasks: initial }: { requestId: string; tasks: Task[] }) {
  const [tasks, setTasks] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError('')
    const fd = new FormData()
    fd.set('requestId', requestId)
    fd.set('title', title)
    startTransition(async () => {
      try {
        await addTask(fd)
        setTitle('')
        setShowAdd(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add task.')
      }
    })
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

  const open = tasks.filter(t => !t.is_done)
  const done = tasks.filter(t => t.is_done)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Tasks
          {open.length > 0 && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {open.length} open
            </span>
          )}
        </h2>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setError('') }}
            className="text-xs text-[#7A9A4A] hover:text-[#4C5E2A] font-medium"
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
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || !title.trim()}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#7A9A4A' }}
            >
              {pending ? 'Saving…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setTitle(''); setError('') }}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {tasks.length === 0 && !showAdd && (
        <p className="text-xs text-gray-400">No tasks yet.</p>
      )}

      {open.length > 0 && (
        <ul className="space-y-1.5 mb-2">
          {open.map(task => (
            <li key={task.id} className="flex items-start gap-2 group">
              <button
                type="button"
                onClick={() => handleToggle(task)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-gray-300 hover:border-[#7A9A4A] transition"
                aria-label="Mark done"
              />
              <span className="flex-1 text-sm text-gray-700">{task.title}</span>
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
        <ul className="space-y-1 border-t border-gray-100 pt-2 mt-1">
          {done.map(task => (
            <li key={task.id} className="flex items-start gap-2 group">
              <button
                type="button"
                onClick={() => handleToggle(task)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-[#7A9A4A] bg-[#7A9A4A] flex items-center justify-center transition"
                aria-label="Mark undone"
              >
                <span className="text-white text-[9px] leading-none">✓</span>
              </button>
              <span className="flex-1 text-sm text-gray-400 line-through">{task.title}</span>
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
