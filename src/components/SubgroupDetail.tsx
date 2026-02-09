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
  subgroupId: string
  occasionId: string
  onBack: () => void
  onUpdate?: () => void
}

interface SubgroupStats {
  totalPaid: number
  balance: number
  expenseCount: number
  memberCount: number
}

export default function SubgroupDetail({ subgroupId, occasionId, onBack, onUpdate }: Props) {
  const [subgroup, setSubgroup] = useState<Subgroup | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [members, setMembers] = useState<Person[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [stats, setStats] = useState<SubgroupStats>({
    totalPaid: 0,
    balance: 0,
    expenseCount: 0,
    memberCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [expenseSplits, setExpenseSplits] = useState<Record<string, ExpenseSplit[]>>({})
  
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false)
  const [manageMembersModalOpen, setManageMembersModalOpen] = useState(false)
  
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: 'food',
    note: ''
  })
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [addingExpense, setAddingExpense] = useState(false)
  
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [updatingMembers, setUpdatingMembers] = useState(false)
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [removeMemberModalOpen, setRemoveMemberModalOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<Person | null>(null)
  const [removingMember, setRemovingMember] = useState(false)

  useEffect(() => {
    loadData()
  }, [subgroupId, occasionId])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadSubgroup(),
        loadMembers(),
        loadExpenses(),
        loadSettlements(),
        loadAllPeople()
      ])
      calculateStats()
    } catch (error) {
      console.error('Error loading subgroup data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSubgroup = async () => {
    const { data, error } = await supabase
      .from('subgroups')
      .select('*')
      .eq('id', subgroupId)
      .single()

    if (error) throw error
    setSubgroup(data)
    setNameValue(data.name)
  }

  const loadMembers = async () => {
    const { data: memberData, error: memberError } = await supabase
      .from('subgroup_members')
      .select('person_id')
      .eq('subgroup_id', subgroupId)

    if (memberError) throw memberError

    if (!memberData || memberData.length === 0) {
      setMembers([])
      setSelectedMembers(new Set())
      return
    }

    const personIds = memberData.map(m => m.person_id)
    setSelectedMembers(new Set(personIds))

    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .in('id', personIds)

    if (peopleError) throw peopleError
    setMembers(peopleData || [])
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

    const memberIds = members.map(m => m.id)
    const subgroupExpenses = (expensesData || []).filter(exp => {
      const isPayer = memberIds.includes(exp.payer_person_id)
      const splits = splitsByExpense[exp.id] || []
      const isSplitWith = splits.some(s => memberIds.includes(s.person_id))
      return isPayer || isSplitWith
    })

    setExpenses(subgroupExpenses)
    setExpenseSplits(splitsByExpense)
  }

  const loadSettlements = async () => {
    const memberIds = members.map(m => m.id)
    
    if (memberIds.length === 0) {
      setSettlements([])
      return
    }

    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('occasion_id', occasionId)
      .or(`from_person_id.in.(${memberIds.join(',')}),to_person_id.in.(${memberIds.join(',')})`)
      .order('date', { ascending: false })

    if (error) throw error
    setSettlements(data || [])
  }

  const calculateStats = () => {
    const memberIds = members.map(m => m.id)
    let totalPaid = 0
    let totalOwing = 0

    expenses.forEach(expense => {
      if (memberIds.includes(expense.payer_person_id)) {
        totalPaid += Number(expense.amount)
      }

      const splits = expenseSplits[expense.id] || []
      splits.forEach(split => {
        if (memberIds.includes(split.person_id)) {
          totalOwing += Number(split.amount)
        }
      })
    })

    let settlementsFrom = 0
    let settlementsTo = 0

    settlements.forEach(settlement => {
      if (memberIds.includes(settlement.from_person_id)) {
        settlementsFrom += Number(settlement.amount)
      }
      if (memberIds.includes(settlement.to_person_id)) {
        settlementsTo += Number(settlement.amount)
      }
    })

    const balance = totalPaid - totalOwing + settlementsFrom - settlementsTo

    setStats({
      totalPaid,
      balance,
      expenseCount: expenses.filter(e => memberIds.includes(e.payer_person_id)).length,
      memberCount: members.length
    })
  }

  const handleSaveName = async () => {
    if (!nameValue.trim() || !subgroup) return

    try {
      const { error } = await supabase
        .from('subgroups')
        .update({ name: nameValue.trim() })
        .eq('id', subgroupId)

      if (error) throw error

      setSubgroup({ ...subgroup, name: nameValue.trim() })
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
      const firstMemberId = members[0]?.id
      
      if (!firstMemberId) return

      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          occasion_id: occasionId,
          payer_person_id: firstMemberId,
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

  const handleUpdateMembers = async () => {
    setUpdatingMembers(true)
    try {
      const { error: deleteError } = await supabase
        .from('subgroup_members')
        .delete()
        .eq('subgroup_id', subgroupId)

      if (deleteError) throw deleteError

      if (selectedMembers.size > 0) {
        const inserts = Array.from(selectedMembers).map(personId => ({
          subgroup_id: subgroupId,
          person_id: personId
        }))

        const { error: insertError } = await supabase
          .from('subgroup_members')
          .insert(inserts)

        if (insertError) throw insertError
      }

      setManageMembersModalOpen(false)
      loadData()
      onUpdate?.()
    } catch (error) {
      console.error('Error updating members:', error)
    } finally {
      setUpdatingMembers(false)
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

  const toggleMember = (personId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(personId)) {
      newSelected.delete(personId)
    } else {
      newSelected.add(personId)
    }
    setSelectedMembers(newSelected)
  }

  const handleDeleteSubgroup = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('subgroups')
        .delete()
        .eq('id', subgroupId)

      if (error) throw error

      setDeleteModalOpen(false)
      onUpdate?.()
      onBack()
    } catch (error) {
      console.error('Error deleting subgroup:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    setRemovingMember(true)
    try {
      const { error } = await supabase
        .from('subgroup_members')
        .delete()
        .eq('subgroup_id', subgroupId)
        .eq('person_id', memberToRemove.id)

      if (error) throw error

      setRemoveMemberModalOpen(false)
      setMemberToRemove(null)
      loadData()
      onUpdate?.()
    } catch (error) {
      console.error('Error removing member:', error)
    } finally {
      setRemovingMember(false)
    }
  }

  if (loading || !subgroup) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="400">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button onClick={onBack}>← Back</Button>
            <Text as="h2" variant="headingLg">{subgroup.name}</Text>
          </div>
          <InlineStack gap="200">
            <Button onClick={() => setAddExpenseModalOpen(true)}>Add Expense</Button>
            <Button onClick={() => setManageMembersModalOpen(true)}>Manage Members</Button>
            <Button variant="primary" tone="critical" onClick={() => setDeleteModalOpen(true)}>Delete Subgroup</Button>
          </InlineStack>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">Details</Text>
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
                      setNameValue(subgroup.name)
                    }}>Cancel</Button>
                  </InlineStack>
                ) : (
                  <BlockStack gap="200">
                    <Text as="p" variant="headingSm">Name</Text>
                    <Text as="p">{subgroup.name}</Text>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Members</Text>
                {members.length > 0 ? (
                  <InlineStack gap="200">
                    {members.map(member => (
                      <s-clickable-chip
                        key={member.id}
                        color="strong"
                        accessibilityLabel={`Remove ${member.name}`}
                        removable
                        onRemove={() => {
                          setMemberToRemove(member)
                          setRemoveMemberModalOpen(true)
                        }}
                      >
                        {member.name}
                      </s-clickable-chip>
                    ))}
                  </InlineStack>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center' }}>
                    <Text as="p" tone="subdued">No members yet</Text>
                  </div>
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
                        <s-table-header>Payer</s-table-header>
                      </s-table-header-row>
                      <s-table-body>
                        {expenses.map((expense) => {
                          const payer = allPeople.find(p => p.id === expense.payer_person_id)
                          
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
                                <s-chip>{payer?.name || 'Unknown'}</s-chip>
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
                    <Text as="p" variant="bodySm" tone="subdued">Members</Text>
                    <Text as="p" variant="headingLg">{stats.memberCount}</Text>
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
            <Text as="p" tone="subdued">Subgroup {subgroup.name} will be set as the payer</Text>
            
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
        open={manageMembersModalOpen}
        onClose={() => setManageMembersModalOpen(false)}
        title="Manage Members"
        primaryAction={{
          content: 'Update Members',
          onAction: handleUpdateMembers,
          loading: updatingMembers
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setManageMembersModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" tone="subdued">Select who belongs to {subgroup.name}:</Text>
            {allPeople.length > 0 ? (
              <BlockStack gap="200">
                {allPeople.map(person => (
                  <Checkbox
                    key={person.id}
                    label={person.name}
                    checked={selectedMembers.has(person.id)}
                    onChange={() => toggleMember(person.id)}
                  />
                ))}
              </BlockStack>
            ) : (
              <Text as="p" tone="subdued">No people available. Add people first.</Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={removeMemberModalOpen}
        onClose={() => setRemoveMemberModalOpen(false)}
        title="Remove Member"
        primaryAction={{
          content: 'Remove',
          onAction: handleRemoveMember,
          loading: removingMember,
          destructive: true
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setRemoveMemberModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FFF4E5',
              border: '1px solid #FFD79D',
              borderRadius: '8px'
            }}>
              <Text as="p" tone="caution">
                {memberToRemove?.name} will be removed from "{subgroup.name}"
              </Text>
            </div>
            <Text as="p">Are you sure you want to continue?</Text>
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Subgroup"
        primaryAction={{
          content: 'Delete',
          onAction: handleDeleteSubgroup,
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
          <Text as="p">Are you sure you want to delete {subgroup.name}? This action cannot be undone.</Text>
        </Modal.Section>
      </Modal>
    </div>
  )
}
