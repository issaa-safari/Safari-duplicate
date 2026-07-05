export type StatusVariant = 'neutral' | 'info' | 'active' | 'warning' | 'success' | 'danger' | 'muted'

export const STATUS_VARIANT: Record<string, StatusVariant> = {
  // request stages
  new:         'warning',
  working_on:  'info',
  open:        'info',
  pre_booked:  'warning',
  booked:      'success',
  completed:   'success',
  not_booked:  'neutral',
  archived:    'muted',
  // quote / version statuses
  draft:       'neutral',
  ready:       'info',
  sent:        'info',
  viewed:      'active',
  accepted:    'success',
  declined:    'danger',
  expired:     'warning',
  superseded:  'muted',
  cancelled:   'neutral',
  // booking statuses
  confirmed:   'success',
  pending:     'warning',
  // departure statuses
  available:   'success',
  full:        'warning',
  closed:      'neutral',
}

export const VARIANT_CLASSES: Record<StatusVariant, string> = {
  neutral: 'bg-gray-100 text-gray-600',
  info:    'bg-blue-100 text-blue-700',
  active:  'bg-indigo-100 text-indigo-700',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-green-100 text-green-700',
  danger:  'bg-red-100 text-red-700',
  muted:   'bg-gray-50 text-gray-400',
}

export const STAGE_LABELS: Record<string, string> = {
  new:         'New',
  working_on:  'Working On',
  open:        'Open',
  pre_booked:  'Pre-Booked',
  booked:      'Booked',
  completed:   'Completed',
  not_booked:  'Not Booked',
  archived:    'Archived',
}
