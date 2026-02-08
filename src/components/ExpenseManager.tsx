import { useState, useEffect } from 'react'
import { Card, TextField, Button, Select, BlockStack, InlineStack, Text, Modal, Checkbox } from '@shopify/polaris'
import { supabase, type Person, type Expense, type ExpenseSplit } from '../lib/supabase'

const EXPENSE_CATEGORIES = [
  { label: 'Accommodation', value: 'accommodation' },
  { label: 'Activities', value: 'activities' },
  { label: 'Entertainment', value: 'entertainment' },
  { label: 'Food & Dining', value: 'food' },
  { label: 'Gifts', value: 'gifts' },
  { label: 'Groceries', value: 'groceries' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Other', value: 'other' },
  { label: 'Shopping', value: 'shopping' },
  { label: 'Transportation', value: 'transportation' },
  { label: 'Utilities', value: 'utilities' }
]

interface Props {
  occasionId: string
  people: Person[]
  onUpdate: () => void
}

export default function ExpenseManager({ occasionId, people, onUpdate }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [splits, setSplits] = useState<Record<string, ExpenseSplit[]>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [newExpense, setNewExpense] = useState({
    payer: '',
    amount: '',
    description: '',
    category: 'food',
    note: ''
  })
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadExpenses()
  }, [occasionId])

  const loadExpenses = async () => {
    try {
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('occasion_id', occasionId)
        .order('date', { ascending: false })

      if (expensesError) throw expensesError

      const { data: splitsData, error: splitsError } = await supabase
        .from('expense_splits')
        .select('*')

      if (splitsError) throw splitsError

      const splitsByExpense: Record<string, ExpenseSplit[]> = {}
      splitsData?.forEach(split => {
        if (!splitsByExpense[split.expense_id]) {
          splitsByExpense[split.expense_id] = []
        }
        splitsByExpense[split.expense_id].push(split)
      })

      setExpenses(expensesData || [])
      setSplits(splitsByExpense)
    } catch (error) {
      console.error('Error loading expenses:', error)
    }
  }

  const handleAddExpense = async () => {
    if (!newExpense.payer || !newExpense.amount || !newExpense.description || selectedPeople.size === 0) {
      return
    }

    setAdding(true)
    try {
      const amount = parseFloat(newExpense.amount)
      
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          occasion_id: occasionId,
          payer_person_id: newExpense.payer,
          amount,
          description: newExpense.description,
          category: newExpense.category,
          note: newExpense.note || null
        }])
        .select()
        .single()

      if (expenseError) throw expenseError

      const shareAmount = amount / selectedPeople.size
      const splitInserts = Array.from(selectedPeople).map(personId => ({
        expense_id: expenseData.id,
        person_id: personId,
        amount: shareAmount
      }))

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitInserts)

      if (splitsError) throw splitsError

      setNewExpense({
        payer: '',
        amount: '',
        description: '',
        category: 'food',
        note: ''
      })
      setSelectedPeople(new Set())
      setIsModalOpen(false)
      loadExpenses()
      onUpdate()
    } catch (error) {
      console.error('Error adding expense:', error)
    } finally {
      setAdding(false)
    }
  }

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return
    
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete)

      if (error) throw error

      setDeleteModalOpen(false)
      setExpenseToDelete(null)
      loadExpenses()
      onUpdate()
    } catch (error) {
      console.error('Error deleting expense:', error)
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteModal = (expenseId: string) => {
    setExpenseToDelete(expenseId)
    setDeleteModalOpen(true)
  }

  const togglePerson = (personId: string) => {
    const newSelected = new Set(selectedPeople)
    if (newSelected.has(personId)) {
      newSelected.delete(personId)
    } else {
      newSelected.add(personId)
    }
    setSelectedPeople(newSelected)
  }

  const payerOptions = people.map(p => ({ label: p.name, value: p.id }))

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingLg">Expenses</Text>
            <Button onClick={() => setIsModalOpen(true)} variant="primary">Add Expense</Button>
          </InlineStack>

          {expenses.length > 0 ? (
            <s-section padding="none">
              <s-table>
              <s-table-header-row>
                <s-table-header>Date</s-table-header>
                <s-table-header>Payer</s-table-header>
                <s-table-header format="currency">Amount</s-table-header>
                <s-table-header>Description</s-table-header>
                <s-table-header>Category</s-table-header>
                <s-table-header>Split With</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {expenses.map(expense => {
                  const payer = people.find(p => p.id === expense.payer_person_id)
                  const expenseSplits = splits[expense.id] || []
                  const splitWith = expenseSplits
                    .map(s => people.find(p => p.id === s.person_id)?.name)
                    .filter(Boolean)
                    .join(', ')
                  
                  return (
                    <s-table-row key={expense.id}>
                      <s-table-cell>{new Date(expense.date).toLocaleDateString()}</s-table-cell>
                      <s-table-cell><s-chip>{payer?.name || 'Unknown'}</s-chip></s-table-cell>
                      <s-table-cell>${Number(expense.amount).toFixed(2)}</s-table-cell>
                      <s-table-cell>{expense.description}</s-table-cell>
                      <s-table-cell><s-chip color="strong">{expense.category}</s-chip></s-table-cell>
                      <s-table-cell>{splitWith}</s-table-cell>
                      <s-table-cell>
                        <Button onClick={() => openDeleteModal(expense.id)} tone="critical" size="slim">
                          Delete
                        </Button>
                      </s-table-cell>
                    </s-table-row>
                  )
                })}
              </s-table-body>
              </s-table>
            </s-section>
          ) : (
            <Text as="p" tone="subdued">No expenses yet. Add an expense to get started!</Text>
          )}
        </BlockStack>
      </Card>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Expense"
        primaryAction={{
          content: 'Delete',
          onAction: handleDeleteExpense,
          loading: deleting,
          destructive: true
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDeleteModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <Text as="p">Are you sure you want to delete this expense? This action cannot be undone.</Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Expense"
        primaryAction={{
          content: 'Add Expense',
          onAction: handleAddExpense,
          loading: adding,
          disabled: !newExpense.payer || !newExpense.amount || !newExpense.description || selectedPeople.size === 0
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setIsModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Select
              label="Who paid?"
              options={payerOptions}
              value={newExpense.payer}
              onChange={(value) => setNewExpense({ ...newExpense, payer: value })}
            />
            
            <TextField
              label="Amount"
              type="number"
              value={newExpense.amount}
              onChange={(value) => setNewExpense({ ...newExpense, amount: value })}
              prefix="$"
              autoComplete="off"
            />
            
            <TextField
              label="Description"
              value={newExpense.description}
              onChange={(value) => setNewExpense({ ...newExpense, description: value })}
              placeholder="e.g., Dinner at restaurant"
              autoComplete="off"
            />
            
            <Select
              label="Category"
              options={EXPENSE_CATEGORIES}
              value={newExpense.category}
              onChange={(value) => setNewExpense({ ...newExpense, category: value })}
            />
            
            <TextField
              label="Note (optional)"
              value={newExpense.note}
              onChange={(value) => setNewExpense({ ...newExpense, note: value })}
              placeholder="Additional notes"
              autoComplete="off"
              multiline={2}
            />
            
            <BlockStack gap="200">
              <Text as="p" variant="headingMd">Split equally among:</Text>
              {people.map(person => (
                <Checkbox
                  key={person.id}
                  label={person.name}
                  checked={selectedPeople.has(person.id)}
                  onChange={() => togglePerson(person.id)}
                />
              ))}
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  )
}
