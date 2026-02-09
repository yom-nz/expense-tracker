import { useState, useEffect } from 'react'
import { Card, TextField, Button, Select, BlockStack, Text, Modal, Checkbox } from '@shopify/polaris'
import { supabase, type Person, type Expense, type ExpenseSplit } from '../lib/supabase'
import ExpenseDetail from './ExpenseDetail'

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
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  
  const [newExpense, setNewExpense] = useState({
    payer: '',
    amount: '',
    description: '',
    category: 'food',
    note: ''
  })
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      setErrorMessage('Failed to load expenses. Please refresh the page.')
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
      setSuccessMessage('Expense added successfully!')
      loadExpenses()
      onUpdate()
    } catch (error) {
      console.error('Error adding expense:', error)
      setErrorMessage('Failed to add expense. Please try again.')
    } finally {
      setAdding(false)
    }
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

  const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
  const categories = new Set(expenses.map(e => e.category))

  if (selectedExpenseId) {
    return (
      <ExpenseDetail
        expenseId={selectedExpenseId}
        occasionId={occasionId}
        onBack={() => setSelectedExpenseId(null)}
        onUpdate={() => {
          loadExpenses()
          onUpdate()
        }}
      />
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="400">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text as="h2" variant="headingLg">Expenses</Text>
          <Button onClick={() => setIsModalOpen(true)} variant="primary">Add Expense</Button>
        </div>

        {successMessage && (
          <s-banner heading="Expense added" tone="success" dismissible={true} onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </s-banner>
        )}

        {errorMessage && (
          <s-banner heading="Failed to add expense" tone="critical" dismissible={true} onDismiss={() => setErrorMessage(null)}>
            {errorMessage} Check your connection and try again.
          </s-banner>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px'
        }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Total Expenses</Text>
              <Text as="h3" variant="headingXl">{expenses.length}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Total Spent</Text>
              <Text as="h3" variant="headingXl">${totalSpent.toFixed(2)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Categories Used</Text>
              <Text as="h3" variant="headingXl">{categories.size}</Text>
            </BlockStack>
          </Card>
        </div>

        <Card>
          <BlockStack gap="400">

          {expenses.length > 0 ? (
            <s-section padding="none">
              <s-table>
                <s-table-header-row>
                  <s-table-header>Date</s-table-header>
                  <s-table-header>Description</s-table-header>
                  <s-table-header>Payer</s-table-header>
                  <s-table-header>Category</s-table-header>
                  <s-table-header>Split With</s-table-header>
                  <s-table-header format="currency">Amount</s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {expenses.map(expense => {
                    const payer = people.find(p => p.id === expense.payer_person_id)
                    const expenseSplits = splits[expense.id] || []
                    
                    return (
                      <s-table-row 
                        key={expense.id}
                        onClick={() => setSelectedExpenseId(expense.id)}
                      >
                        <s-table-cell>
                          {new Date(expense.date).toLocaleDateString()}
                        </s-table-cell>
                        <s-table-cell>
                          <Text as="span" fontWeight="semibold">{expense.description}</Text>
                        </s-table-cell>
                        <s-table-cell>
                          <s-chip>{payer?.name || 'Unknown'}</s-chip>
                        </s-table-cell>
                        <s-table-cell>
                          <s-chip color="strong">{expense.category}</s-chip>
                        </s-table-cell>
                        <s-table-cell>
                          {expenseSplits.length} {expenseSplits.length === 1 ? 'person' : 'people'}
                        </s-table-cell>
                        <s-table-cell>
                          ${Number(expense.amount).toFixed(2)}
                        </s-table-cell>
                      </s-table-row>
                    )
                  })}
                </s-table-body>
              </s-table>
            </s-section>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <Text as="p" tone="subdued">No expenses yet. Add an expense to get started!</Text>
            </div>
          )}
          </BlockStack>
        </Card>
      </BlockStack>

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
    </div>
  )
}
