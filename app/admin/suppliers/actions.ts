'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { SUPPLIER_TYPES } from './constants'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

function supplierValues(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const supplierType = formData.get('supplierType') as string
  if (!name) throw new Error('Supplier name is required.')
  if (!SUPPLIER_TYPES.includes(supplierType as typeof SUPPLIER_TYPES[number])) {
    throw new Error('Invalid supplier type.')
  }
  return {
    name,
    supplier_type: supplierType,
    contact_email: (formData.get('contactEmail') as string)?.trim() || null,
    contact_phone: (formData.get('contactPhone') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
  }
}

export async function createSupplier(formData: FormData) {
  const { admin } = await authGuard()
  const { error } = await admin.from('suppliers').insert(supplierValues(formData))
  if (error) {
    throw new Error(error.code === '23505' ? 'A supplier with this name already exists.' : error.message)
  }
  revalidatePath('/admin/suppliers')
}

export async function updateSupplier(formData: FormData) {
  const { admin } = await authGuard()
  const supplierId = formData.get('supplierId') as string
  if (!supplierId) throw new Error('Supplier is required.')
  const { error } = await admin.from('suppliers').update(supplierValues(formData)).eq('id', supplierId)
  if (error) {
    throw new Error(error.code === '23505' ? 'A supplier with this name already exists.' : error.message)
  }
  revalidatePath('/admin/suppliers')
}

export async function setSupplierActive(formData: FormData) {
  const { admin } = await authGuard()
  const supplierId = formData.get('supplierId') as string
  const isActive = formData.get('isActive') === 'true'
  if (!supplierId) throw new Error('Supplier is required.')
  const { error } = await admin.from('suppliers').update({ is_active: isActive }).eq('id', supplierId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/suppliers')
}
