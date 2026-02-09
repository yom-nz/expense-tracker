import { useState, useEffect } from 'react'
import { Card, Text, BlockStack, InlineStack, Button, TextField, Select, Modal, Checkbox, Banner } from '@shopify/polaris'
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
  expenseId: string
  occasionId: string
  onBack: () => void
  onUpdate?: () => void
}

interface ExpenseStats {
  totalAmount: number
  splitCount: number
  amountPerPerson: number
}

export default function ExpenseDetail({ expenseId, occasionId, onBack, onUpdate }: Props) {
  const [expense, setExpense] = useState<Expense | null>(null)
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [payer, setPayer] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [editForm, setEditForm] = useState({
    payer: '',
    amount: '',
    description: '',
    category: '',
    note: ''
  })
  
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const [stats, setStats] = useState<ExpenseStats>({
    totalAmount: 0,
    splitCount: 0,
    amountPerPerson: 0
  })

  useEffect(() => {
    loadData()
  }, [expenseId, occasionId])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadExpense(),
        loadSplits(),
        loadAllPeople()
      ])
    } catch (error) {
      console.error('Error loading expense data:', error)
      setErrorMessage('Failed to load expense details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadExpense = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (error) throw error
    setExpense(data)
    setEditForm({
      payer: data.payer_person_id,
      amount: data.amount.toString(),
      description: data.description,
      category: data.category,
      note: data.note || ''
    })
  }

  const loadSplits = async () => {
    const { data, error } = await supabase
      .from('expense_splits')
      .select('*')
      .eq('expense_id', expenseId)

    if (error) throw error
    setSplits(data || [])
    
    const splitPeopleIds = (data || []).map(s => s.person_id)
    setSelectedPeople(new Set(splitPeopleIds))
  }

  const loadAllPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('occasion_id', occasionId)

    if (error) throw error
    setAllPeople(data || [])
  }

  useEffect(() => {
    calculateStats()
  }, [expense, splits, allPeople])

  const calculateStats = () => {
    if (!expense || !splits.length) return

    const totalAmount = Number(expense.amount)
    const splitCount = splits.length
    const amountPerPerson = totalAmount / splitCount

    setStats({
      totalAmount,
      splitCount,
      amountPerPerson
    })

    const payerPerson = allPeople.find(p => p.id === expense.payer_person_id)
    setPayer(payerPerson || null)
  }

  const handleEditToggle = () => {
    if (isEditing && expense) {
      setEditForm({
        payer: expense.payer_person_id,
        amount: expense.amount.toString(),
        description: expense.description,
        category: expense.category,
        note: expense.note || ''
      })
      const splitPeopleIds = splits.map(s => s.person_id)
      setSelectedPeople(new Set(splitPeopleIds))
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    if (!editForm.payer || !editForm.amount || !editForm.description || selectedPeople.size === 0) {
      return
    }

    setSaving(true)
    try {
      const amount = parseFloat(editForm.amount)
      
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          payer_person_id: editForm.payer,
          amount,
          description: editForm.description,
          category: editForm.category,
          note: editForm.note || null
        })
        .eq('id', expenseId)

      if (expenseError) throw expenseError

      const { error: deleteSplitsError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId)

      if (deleteSplitsError) throw deleteSplitsError

      const shareAmount = amount / selectedPeople.size
      const splitInserts = Array.from(selectedPeople).map(personId => ({
        expense_id: expenseId,
        person_id: personId,
        amount: shareAmount
      }))

      const { error: insertSplitsError } = await supabase
        .from('expense_splits')
        .insert(splitInserts)

      if (insertSplitsError) throw insertSplitsError

      setIsEditing(false)
      setSuccessMessage('Expense updated successfully!')
      await loadData()
      onUpdate?.()
    } catch (error) {
      console.error('Error saving expense:', error)
      setErrorMessage('Failed to save expense. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      setDeleteModalOpen(false)
      onUpdate?.()
      onBack()
    } catch (error) {
      console.error('Error deleting expense:', error)
    } finally {
      setDeleting(false)
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

  if (loading || !expense) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="400">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button onClick={onBack}>← Back</Button>
            <Text as="h2" variant="headingLg">{expense.description}</Text>
          </div>
          <InlineStack gap="200">
            {isEditing ? (
              <>
                <Button onClick={handleEditToggle}>Cancel</Button>
                <Button variant="primary" tone="success" onClick={handleSave} loading={saving}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleEditToggle}>Edit Expense</Button>
                <Button variant="primary" tone="critical" onClick={() => setDeleteModalOpen(true)}>
                  Delete Expense
                </Button>
              </>
            )}
          </InlineStack>
        </div>

        {successMessage && (
          <s-banner heading="Expense updated" tone="success" dismissible={true} onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </s-banner>
        )}

        {errorMessage && (
          <s-banner heading="Failed to update expense" tone="critical" dismissible={true} onDismiss={() => setErrorMessage(null)}>
            {errorMessage} Check your connection and try again.
          </s-banner>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Details</Text>

                {isEditing ? (
                  <BlockStack gap="400">
                    <TextField
                      label="Description"
                      value={editForm.description}
                      onChange={(value) => setEditForm({ ...editForm, description: value })}
                      autoComplete="off"
                    />

                    <TextField
                      label="Amount"
                      type="number"
                      value={editForm.amount}
                      onChange={(value) => setEditForm({ ...editForm, amount: value })}
                      prefix="$"
                      autoComplete="off"
                    />

                    <Select
                      label="Category"
                      options={EXPENSE_CATEGORIES}
                      value={editForm.category}
                      onChange={(value) => setEditForm({ ...editForm, category: value })}
                    />

                    <TextField
                      label="Note (optional)"
                      value={editForm.note}
                      onChange={(value) => setEditForm({ ...editForm, note: value })}
                      multiline={2}
                      autoComplete="off"
                    />
                  </BlockStack>
                ) : (
                  <BlockStack gap="300">
                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm">Description</Text>
                      <Text as="p">{expense.description}</Text>
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm">Amount</Text>
                      <Text as="p">${Number(expense.amount).toFixed(2)}</Text>
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm">Category</Text>
                      <Text as="p">{expense.category}</Text>
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm">Note</Text>
                      <Text as="p" tone={expense.note ? undefined : 'subdued'}>
                        {expense.note || 'No note added'}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm">Date</Text>
                      <Text as="p">{new Date(expense.date).toLocaleDateString()}</Text>
                    </BlockStack>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Split Details</Text>
                
                {isEditing ? (
                  <BlockStack gap="400">
                    <Select
                      label="Who paid?"
                      options={allPeople.map(p => ({ label: p.name, value: p.id }))}
                      value={editForm.payer}
                      onChange={(value) => setEditForm({ ...editForm, payer: value })}
                    />

                    <BlockStack gap="200">
                      <Text as="p" variant="headingMd">Split equally among:</Text>
                      {allPeople.map(person => (
                        <Checkbox
                          key={person.id}
                          label={person.name}
                          checked={selectedPeople.has(person.id)}
                          onChange={() => togglePerson(person.id)}
                        />
                      ))}
                    </BlockStack>
                  </BlockStack>
                ) : (
                  <BlockStack gap="400">
                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm">Paid by</Text>
                      <Text as="p">{payer?.name || 'Unknown'}</Text>
                    </BlockStack>

                    <BlockStack gap="200">
                      <Text as="p" variant="headingSm">Split with ({splits.length} {splits.length === 1 ? 'person' : 'people'})</Text>
                      <s-section padding="none">
                        <s-table>
                          <s-table-header-row>
                            <s-table-header>Person</s-table-header>
                            <s-table-header format="currency">Share</s-table-header>
                          </s-table-header-row>
                          <s-table-body>
                            {splits.map((split) => {
                              const person = allPeople.find(p => p.id === split.person_id)
                              return (
                                <s-table-row key={split.id}>
                                  <s-table-cell>
                                    <s-chip>{person?.name || 'Unknown'}</s-chip>
                                  </s-table-cell>
                                  <s-table-cell>
                                    ${Number(split.amount).toFixed(2)}
                                  </s-table-cell>
                                </s-table-row>
                              )
                            })}
                          </s-table-body>
                        </s-table>
                      </s-section>
                    </BlockStack>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </BlockStack>

          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Summary</Text>
                
                <BlockStack gap="300">
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Total Amount</Text>
                    <Text as="p" variant="headingLg">
                      ${isEditing && editForm.amount ? parseFloat(editForm.amount).toFixed(2) : stats.totalAmount.toFixed(2)}
                    </Text>
                  </div>

                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Split Between</Text>
                    <Text as="p" variant="headingLg">
                      {isEditing ? selectedPeople.size : stats.splitCount} {(isEditing ? selectedPeople.size : stats.splitCount) === 1 ? 'person' : 'people'}
                    </Text>
                  </div>

                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Per Person</Text>
                    <Text as="p" variant="headingLg">
                      ${isEditing && editForm.amount && selectedPeople.size > 0 
                        ? (parseFloat(editForm.amount) / selectedPeople.size).toFixed(2)
                        : stats.amountPerPerson.toFixed(2)}
                    </Text>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </div>
      </BlockStack>

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
    </div>
  )
}
