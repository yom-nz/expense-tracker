import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Occasion = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type Collection = Occasion

export type Person = {
  id: string
  occasion_id: string
  name: string
  created_at: string
}

export type Subgroup = {
  id: string
  occasion_id: string
  name: string
  created_at: string
}

export type SubgroupMember = {
  id: string
  subgroup_id: string
  person_id: string
}

export type Expense = {
  id: string
  occasion_id: string
  payer_person_id: string | null
  payer_subgroup_id: string | null
  amount: number
  description: string
  category: string
  note: string | null
  date: string
  created_at: string
}

export type ExpenseSplit = {
  id: string
  expense_id: string
  person_id: string
  amount: number
}

export type Settlement = {
  id: string
  occasion_id: string
  from_person_id: string | null
  from_subgroup_id: string | null
  to_person_id: string | null
  to_subgroup_id: string | null
  amount: number
  date: string
  created_at: string
}
