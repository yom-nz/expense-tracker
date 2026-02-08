import { useState, useEffect } from 'react'
import { Card, Text, BlockStack, InlineStack, Button, TextField, Badge, Modal, Select, Checkbox } from '@shopify/polaris'
import { supabase, type Person, type Expense, type Settlement, type ExpenseSplit, type Subgroup, type SubgroupMember } from '../lib/supabase'

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
  personId: string
  occasionId: string
  onBack: () => void
  onUpdate?: () => void
}

interface PersonStats {
  totalPaid: number
  totalOwed: number
  totalOwing: number
  balance: number
  expenseCount: number
  subgroupCount: number
}

export default function PersonDetail({ personId, occasionId, onBack, onUpdate }: Props) {
  const [person, setPerson] = useState<Person | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [subgroups, setSubgroups] = useState<Subgroup[]>([])
  const [stats, setStats] = useState<PersonStats>({
    totalPaid: 0,
    totalOwed: 0,
    totalOwing: 0,
    balance: 0,
    expenseCount: 0,
    subgroupCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [allPeople, setAllPeople] = useState<Person[]>([])  
  const [expenseSplits, setExpenseSplits] = useState<Record<string, ExpenseSplit[]>>({})
  const [allSubgroups, setAllSubgroups] = useState<Subgroup[]>([])
  const [allSubgroupMembers, setAllSubgroupMembers] = useState<SubgroupMember[]>([])
  
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false)
  const [addSettlementModalOpen, setAddSettlementModalOpen] = useState(false)
  const [manageSubgroupsModalOpen, setManageSubgroupsModalOpen] = useState(false)
  
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: 'food',
    note: ''
  })
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [addingExpense, setAddingExpense] = useState(false)
  
  const [newSettlement, setNewSettlement] = useState({
    to: '',
    amount: ''
  })
  const [addingSettlement, setAddingSettlement] = useState(false)
  
  const [selectedSubgroups, setSelectedSubgroups] = useState<Set<string>>(new Set())
  const [updatingSubgroups, setUpdatingSubgroups] = useState(false)
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [personId, occasionId])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPerson(),
        loadExpenses(),
        loadSettlements(),
        loadSubgroups(),
        loadAllPeople(),
        loadAllSubgroups()
      ])
      calculateStats()
    } catch (error) {
      console.error('Error loading person data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPerson = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .single()

    if (error) throw error
    setPerson(data)
    setNameValue(data.name)
  }

  const loadAllPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('occasion_id', occasionId)

    if (error) throw error
    setAllPeople(data || [])
  }

  const loadExpenses = async () => {
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

    const personExpenses = (expensesData || []).filter(exp => {
      const isPayer = exp.payer_person_id === personId
      const splits = splitsByExpense[exp.id] || []
      const isSplitWith = splits.some(s => s.person_id === personId)
      return isPayer || isSplitWith
    })

    setExpenses(personExpenses)
    setExpenseSplits(splitsByExpense)
  }

  const loadSettlements = async () => {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('occasion_id', occasionId)
      .or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`)
      .order('date', { ascending: false })

    if (error) throw error
    setSettlements(data || [])
  }

  const loadSubgroups = async () => {
    const { data: membersData, error: membersError } = await supabase
      .from('subgroup_members')
      .select('subgroup_id')
      .eq('person_id', personId)

    if (membersError) throw membersError

    if (!membersData || membersData.length === 0) {
      setSubgroups([])
      setSelectedSubgroups(new Set())
      return
    }

    const subgroupIds = membersData.map(m => m.subgroup_id)
    setSelectedSubgroups(new Set(subgroupIds))
    
    const { data: subgroupsData, error: subgroupsError } = await supabase
      .from('subgroups')
      .select('*')
      .in('id', subgroupIds)

    if (subgroupsError) throw subgroupsError
    setSubgroups(subgroupsData || [])
  }

  const loadAllSubgroups = async () => {
    const { data: subgroupsData, error: subgroupsError } = await supabase
      .from('subgroups')
      .select('*')
      .eq('occasion_id', occasionId)

    if (subgroupsError) throw subgroupsError

    const { data: membersData, error: membersError } = await supabase
      .from('subgroup_members')
      .select('*')

    if (membersError) throw membersError

    setAllSubgroups(subgroupsData || [])
    setAllSubgroupMembers(membersData || [])
  }

  const calculateStats = async () => {
    const { data: allSplits, error } = await supabase
      .from('expense_splits')
      .select('*')

    if (error) {
      console.error('Error loading splits:', error)
      return
    }

    let totalPaid = 0
    let totalOwing = 0

    expenses.forEach(expense => {
      if (expense.payer_person_id === personId) {
        totalPaid += Number(expense.amount)
      }

      const splits = expenseSplits[expense.id] || []
      const personSplit = splits.find(s => s.person_id === personId)
      if (personSplit) {
        totalOwing += Number(personSplit.amount)
      }
    })

    let settlementsFrom = 0
    let settlementsTo = 0

    settlements.forEach(settlement => {
      if (settlement.from_person_id === personId) {
        settlementsFrom += Number(settlement.amount)
      }
      if (settlement.to_person_id === personId) {
        settlementsTo += Number(settlement.amount)
      }
    })

    const balance = totalPaid - totalOwing + settlementsFrom - settlementsTo

    setStats({
      totalPaid,
      totalOwed: balance > 0 ? balance : 0,
      totalOwing: balance < 0 ? Math.abs(balance) : 0,
      balance,
      expenseCount: expenses.filter(e => e.payer_person_id === personId).length,
      subgroupCount: subgroups.length
    })
  }

  const handleSaveName = async () => {
    if (!nameValue.trim() || !person) return

    try {
      const { error } = await supabase
        .from('people')
        .update({ name: nameValue.trim() })
        .eq('id', personId)

      if (error) throw error

      setPerson({ ...person, name: nameValue.trim() })
      setEditingName(false)
      onUpdate?.()
    } catch (error) {
      console.error('Error updating name:', error)
    }
  }

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.description || selectedPeople.size === 0) return

    setAddingExpense(true)
    try {
      const amount = parseFloat(newExpense.amount)
      
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          occasion_id: occasionId,
          payer_person_id: personId,
          amount,
          description: newExpense.description,
          category: newExpense.category,
          note: newExpense.note || null
        }])
        .select()
        .single()

      if (expenseError) throw expenseError

      const shareAmount = amount / selectedPeople.size
      const splitInserts = Array.from(selectedPeople).map(pid => ({
        expense_id: expenseData.id,
        person_id: pid,
        amount: shareAmount
      }))

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splitInserts)

      if (splitsError) throw splitsError

      setNewExpense({ amount: '', description: '', category: 'food', note: '' })
      setSelectedPeople(new Set())
      setAddExpenseModalOpen(false)
      loadData()
      onUpdate?.()
    } catch (error) {
      console.error('Error adding expense:', error)
    } finally {
      setAddingExpense(false)
    }
  }

  const handleAddSettlement = async () => {
    if (!newSettlement.to || !newSettlement.amount) return

    setAddingSettlement(true)
    try {
      const { error } = await supabase
        .from('settlements')
        .insert([{
          occasion_id: occasionId,
          from_person_id: personId,
          to_person_id: newSettlement.to,
          amount: parseFloat(newSettlement.amount)
        }])

      if (error) throw error

      setNewSettlement({ to: '', amount: '' })
      setAddSettlementModalOpen(false)
      loadData()
      onUpdate?.()
    } catch (error) {
      console.error('Error adding settlement:', error)
    } finally {
      setAddingSettlement(false)
    }
  }

  const handleUpdateSubgroups = async () => {
    setUpdatingSubgroups(true)
    try {
      const { error: deleteError } = await supabase
        .from('subgroup_members')
        .delete()
        .eq('person_id', personId)

      if (deleteError) throw deleteError

      if (selectedSubgroups.size > 0) {
        const inserts = Array.from(selectedSubgroups).map(subgroupId => ({
          subgroup_id: subgroupId,
          person_id: personId
        }))

        const { error: insertError } = await supabase
          .from('subgroup_members')
          .insert(inserts)

        if (insertError) throw insertError
      }

      setManageSubgroupsModalOpen(false)
      loadData()
      onUpdate?.()
    } catch (error) {
      console.error('Error updating subgroups:', error)
    } finally {
      setUpdatingSubgroups(false)
    }
  }

  const togglePerson = (pid: string) => {
    const newSelected = new Set(selectedPeople)
    if (newSelected.has(pid)) {
      newSelected.delete(pid)
    } else {
      newSelected.add(pid)
    }
    setSelectedPeople(newSelected)
  }

  const toggleSubgroup = (subgroupId: string) => {
    const newSelected = new Set(selectedSubgroups)
    if (newSelected.has(subgroupId)) {
      newSelected.delete(subgroupId)
    } else {
      newSelected.add(subgroupId)
    }
    setSelectedSubgroups(newSelected)
  }

  const handleDeletePerson = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', personId)

      if (error) throw error

      setDeleteModalOpen(false)
      onUpdate?.()
      onBack()
    } catch (error) {
      console.error('Error deleting person:', error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading || !person) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="400">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button onClick={onBack}>← Back</Button>
            <Text as="h2" variant="headingLg">{person.name}</Text>
          </div>
          <InlineStack gap="200">
            <Button onClick={() => setAddExpenseModalOpen(true)}>Add Expense</Button>
            <Button onClick={() => setAddSettlementModalOpen(true)}>Add Settlement</Button>
            <Button onClick={() => setManageSubgroupsModalOpen(true)}>Manage Subgroups</Button>
            <Button variant="primary" tone="critical" onClick={() => setDeleteModalOpen(true)}>Delete Person</Button>
          </InlineStack>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">Profile</Text>
                  {!editingName && (
                    <Button size="slim" onClick={() => setEditingName(true)}>Edit</Button>
                  )}
                </InlineStack>

                {editingName ? (
                  <InlineStack gap="200" blockAlign="end">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Name"
                        value={nameValue}
                        onChange={setNameValue}
                        autoComplete="off"
                      />
                    </div>
                    <Button onClick={handleSaveName}>Save</Button>
                    <Button onClick={() => {
                      setEditingName(false)
                      setNameValue(person.name)
                    }}>Cancel</Button>
                  </InlineStack>
                ) : (
                  <BlockStack gap="200">
                    <Text as="p" variant="headingSm">Name</Text>
                    <Text as="p">{person.name}</Text>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Expenses</Text>
                {expenses.length > 0 ? (
                  <s-section padding="none">
                    <s-table>
                      <s-table-header-row>
                        <s-table-header>Date</s-table-header>
                        <s-table-header>Description</s-table-header>
                        <s-table-header>Category</s-table-header>
                        <s-table-header format="currency">Amount</s-table-header>
                        <s-table-header>Role</s-table-header>
                      </s-table-header-row>
                      <s-table-body>
                        {expenses.map((expense) => {
                          const isPayer = expense.payer_person_id === personId
                          const splits = expenseSplits[expense.id] || []
                          const personSplit = splits.find(s => s.person_id === personId)
                          
                          return (
                            <s-table-row key={expense.id}>
                              <s-table-cell>
                                {new Date(expense.date).toLocaleDateString()}
                              </s-table-cell>
                              <s-table-cell>
                                <Text as="span" fontWeight="semibold">{expense.description}</Text>
                              </s-table-cell>
                              <s-table-cell>
                                <s-chip color="strong">{expense.category}</s-chip>
                              </s-table-cell>
                              <s-table-cell>
                                ${Number(expense.amount).toFixed(2)}
                              </s-table-cell>
                              <s-table-cell>
                                {isPayer ? (
                                  <Badge tone="success">Paid</Badge>
                                ) : personSplit ? (
                                  <Badge tone="attention">Split (${Number(personSplit.amount).toFixed(2)})</Badge>
                                ) : null}
                              </s-table-cell>
                            </s-table-row>
                          )
                        })}
                      </s-table-body>
                    </s-table>
                  </s-section>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center' }}>
                    <Text as="p" tone="subdued">No expenses found</Text>
                  </div>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Settlements</Text>
                {settlements.length > 0 ? (
                  <s-section padding="none">
                    <s-table>
                      <s-table-header-row>
                        <s-table-header>Date</s-table-header>
                        <s-table-header>From</s-table-header>
                        <s-table-header>To</s-table-header>
                        <s-table-header format="currency">Amount</s-table-header>
                      </s-table-header-row>
                      <s-table-body>
                        {settlements.map((settlement) => {
                          const fromPerson = allPeople.find(p => p.id === settlement.from_person_id)
                          const toPerson = allPeople.find(p => p.id === settlement.to_person_id)
                          
                          return (
                            <s-table-row key={settlement.id}>
                              <s-table-cell>
                                {new Date(settlement.date).toLocaleDateString()}
                              </s-table-cell>
                              <s-table-cell>
                                <s-chip>{fromPerson?.name || 'Unknown'}</s-chip>
                              </s-table-cell>
                              <s-table-cell>
                                <s-chip>{toPerson?.name || 'Unknown'}</s-chip>
                              </s-table-cell>
                              <s-table-cell>
                                ${Number(settlement.amount).toFixed(2)}
                              </s-table-cell>
                            </s-table-row>
                          )
                        })}
                      </s-table-body>
                    </s-table>
                  </s-section>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center' }}>
                    <Text as="p" tone="subdued">No settlements found</Text>
                  </div>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Subgroups</Text>
                {subgroups.length > 0 ? (
                  <InlineStack gap="200">
                    {subgroups.map(subgroup => (
                      <button
                        key={subgroup.id}
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            const { error } = await supabase
                              .from('subgroup_members')
                              .delete()
                              .eq('subgroup_id', subgroup.id)
                              .eq('person_id', personId)

                            if (error) throw error

                            loadData()
                            onUpdate?.()
                          } catch (error) {
                            console.error('Error removing from subgroup:', error)
                          }
                        }}
                        style={{
                          all: 'unset',
                          cursor: 'pointer'
                        }}
                      >
                        <Badge key={subgroup.id} tone="info">{subgroup.name}</Badge>
                      </button>
                    ))}
                  </InlineStack>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center' }}>
                    <Text as="p" tone="subdued">Not in any subgroups</Text>
                  </div>
                )}
              </BlockStack>
            </Card>
          </BlockStack>

          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Overview</Text>
                
                <BlockStack gap="300">
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Total Paid</Text>
                    <Text as="p" variant="headingLg">${stats.totalPaid.toFixed(2)}</Text>
                  </div>

                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Balance</Text>
                    <Text 
                      as="p" 
                      variant="headingLg"
                      tone={stats.balance > 0.01 ? 'success' : stats.balance < -0.01 ? 'critical' : undefined}
                    >
                      {stats.balance > 0.01 ? '+' : stats.balance < -0.01 ? '-' : ''}$
                      {Math.abs(stats.balance).toFixed(2)}
                    </Text>
                  </div>

                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Expenses Paid</Text>
                    <Text as="p" variant="headingLg">{stats.expenseCount}</Text>
                  </div>

                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Subgroups</Text>
                    <Text as="p" variant="headingLg">{stats.subgroupCount}</Text>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </div>
      </BlockStack>

      <Modal
        open={addExpenseModalOpen}
        onClose={() => setAddExpenseModalOpen(false)}
        title="Add Expense"
        primaryAction={{
          content: 'Add Expense',
          onAction: handleAddExpense,
          loading: addingExpense,
          disabled: !newExpense.amount || !newExpense.description || selectedPeople.size === 0
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setAddExpenseModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" tone="subdued">{person.name} will be set as the payer</Text>
            
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
              {allPeople.map(p => (
                <Checkbox
                  key={p.id}
                  label={p.name}
                  checked={selectedPeople.has(p.id)}
                  onChange={() => togglePerson(p.id)}
                />
              ))}
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={addSettlementModalOpen}
        onClose={() => setAddSettlementModalOpen(false)}
        title="Add Settlement"
        primaryAction={{
          content: 'Add Settlement',
          onAction: handleAddSettlement,
          loading: addingSettlement,
          disabled: !newSettlement.to || !newSettlement.amount
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setAddSettlementModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" tone="subdued">{person.name} is paying to:</Text>
            
            <Select
              label="To (who is receiving)"
              options={allPeople.filter(p => p.id !== personId).map(p => ({ label: p.name, value: p.id }))}
              value={newSettlement.to}
              onChange={(value) => setNewSettlement({ ...newSettlement, to: value })}
            />
            
            <TextField
              label="Amount"
              type="number"
              value={newSettlement.amount}
              onChange={(value) => setNewSettlement({ ...newSettlement, amount: value })}
              prefix="$"
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={manageSubgroupsModalOpen}
        onClose={() => setManageSubgroupsModalOpen(false)}
        title="Manage Subgroups"
        primaryAction={{
          content: 'Update Subgroups',
          onAction: handleUpdateSubgroups,
          loading: updatingSubgroups
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setManageSubgroupsModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" tone="subdued">Select which subgroups {person.name} belongs to:</Text>
            {allSubgroups.length > 0 ? (
              <BlockStack gap="200">
                {allSubgroups.map(subgroup => (
                  <Checkbox
                    key={subgroup.id}
                    label={subgroup.name}
                    checked={selectedSubgroups.has(subgroup.id)}
                    onChange={() => toggleSubgroup(subgroup.id)}
                  />
                ))}
              </BlockStack>
            ) : (
              <Text as="p" tone="subdued">No subgroups available. Create subgroups first.</Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Person"
        primaryAction={{
          content: 'Delete',
          onAction: handleDeletePerson,
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
          <Text as="p">Are you sure you want to delete {person.name}? All their expenses and splits will also be deleted. This action cannot be undone.</Text>
        </Modal.Section>
      </Modal>
    </div>
  )
}
