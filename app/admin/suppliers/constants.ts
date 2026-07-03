export const SUPPLIER_TYPES = ['accommodation', 'transport', 'park', 'activity', 'staff', 'other'] as const
export type SupplierType = (typeof SUPPLIER_TYPES)[number]

export interface SupplierRow {
  id: string
  name: string
  supplier_type: SupplierType | string
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  is_active: boolean
}
