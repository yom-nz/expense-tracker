import { useState, useEffect } from 'react'
import { Card, BlockStack, Text, InlineStack, Button, Modal, Select, TextField, List, Banner } from '@shopify/polaris'
import { supabase, type Person, type Expense, type Settlement } from '../lib/supabase'

interface Props {
  occasionId: string
  people: Person[]
  expenses: Expense[]
  settlements: Settlement[]
  onSettlementAdded: () => void
}

interface Balance {
  personId: string
  personName: string
  balance: number
}

export default function BalancesView({ occasionId, people, expenses, settlements, onSettlementAdded }: Props) {
  const [balances, setBalances] = useState<Balance[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSettlement, setNewSettlement] = useState({
    from: '',
    to: '',
    amount: ''
  })
  const [adding, setAdding] = useState(false)
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    calculateBalances()
  }, [expenses, settlements, people])

  const calculateBalances = async () => {
    try {
      const { data: allSplits, error } = await supabase
        .from('expense_splits')
        .select('*')

      if (error) throw error

      const balanceMap: Record<string, number> = {}
      people.forEach(person => {
        balanceMap[person.id] = 0
      })

      expenses.forEach(expense => {
        if (expense.payer_person_id) {
          balanceMap[expense.payer_person_id] += Number(expense.amount)
        }
      })

      allSplits?.forEach(split => {
        if (balanceMap[split.person_id] !== undefined) {
          balanceMap[split.person_id] -= Number(split.amount)
        }
      })

      settlements.forEach(settlement => {
        if (settlement.from_person_id && balanceMap[settlement.from_person_id] !== undefined) {
          balanceMap[settlement.from_person_id] += Number(settlement.amount)
        }
        if (settlement.to_person_id && balanceMap[settlement.to_person_id] !== undefined) {
          balanceMap[settlement.to_person_id] -= Number(settlement.amount)
        }
      })

      const balanceArray: Balance[] = people.map(person => ({
        personId: person.id,
        personName: person.name,
        balance: balanceMap[person.id] || 0
      }))

      balanceArray.sort((a, b) => b.balance - a.balance)
      setBalances(balanceArray)
    } catch (error) {
      console.error('Error calculating balances:', error)
    }
  }

  const handleAddSettlement = async () => {
    if (!newSettlement.from || !newSettlement.to || !newSettlement.amount) return

    setAdding(true)
    try {
      const { error } = await supabase
        .from('settlements')
        .insert([{
          occasion_id: occasionId,
          from_person_id: newSettlement.from,
          to_person_id: newSettlement.to,
          amount: parseFloat(newSettlement.amount)
        }])

      if (error) throw error

      setNewSettlement({ from: '', to: '', amount: '' })
      setIsModalOpen(false)
      setSuccessMessage('Settlement recorded successfully!')
      onSettlementAdded()
    } catch (error) {
      console.error('Error adding settlement:', error)
      setErrorMessage('Failed to record settlement. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const getSuggestedSettlements = () => {
    const creditors = balances.filter(b => b.balance > 0.01)
    const debtors = balances.filter(b => b.balance < -0.01)

    const suggestions: Array<{ from: string; to: string; amount: number }> = []
    const creditorsClone = creditors.map(c => ({ ...c }))
    const debtorsClone = debtors.map(d => ({ ...d, balance: -d.balance }))

    while (creditorsClone.length > 0 && debtorsClone.length > 0) {
      creditorsClone.sort((a, b) => b.balance - a.balance)
      debtorsClone.sort((a, b) => b.balance - a.balance)

      const creditor = creditorsClone[0]
      const debtor = debtorsClone[0]

      const amount = Math.min(creditor.balance, debtor.balance)
      suggestions.push({
        from: debtor.personName,
        to: creditor.personName,
        amount
      })

      creditor.balance -= amount
      debtor.balance -= amount

      if (creditor.balance < 0.01) creditorsClone.shift()
      if (debtor.balance < 0.01) debtorsClone.shift()
    }

    return suggestions
  }

  const personOptions = people.map(p => ({ label: p.name, value: p.id }))
  const suggestions = getSuggestedSettlements()

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="400">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text as="h2" variant="headingLg">Balances</Text>
          <Button onClick={() => setIsModalOpen(true)} variant="primary">Record Settlement</Button>
        </div>

        {successMessage && (
          <s-banner heading="Settlement recorded" tone="success" dismissible={true} onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </s-banner>
        )}

        {errorMessage && (
          <s-banner heading="Failed to record settlement" tone="critical" dismissible={true} onDismiss={() => setErrorMessage(null)}>
            {errorMessage} Verify both people exist and try again.
          </s-banner>
        )}

        <Card>
          <BlockStack gap="400">

          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">Individual Balances</Text>
            <s-section padding="none">
              <s-table>
                <s-table-header-row>
                  <s-table-header>Person</s-table-header>
                  <s-table-header format="currency">Balance</s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {balances.map(balance => (
                    <s-table-row key={balance.personId}>
                      <s-table-cell>
                        <s-chip>{balance.personName}</s-chip>
                      </s-table-cell>
                      <s-table-cell>
                        <Text 
                          as="span" 
                          variant="bodyLg"
                          tone={balance.balance > 0.01 ? 'success' : balance.balance < -0.01 ? 'critical' : undefined}
                        >
                          {balance.balance > 0.01 ? '+' : ''}{balance.balance < -0.01 ? '-' : ''}$
                          {Math.abs(balance.balance).toFixed(2)}
                        </Text>
                      </s-table-cell>
                    </s-table-row>
                  ))}
                </s-table-body>
              </s-table>
            </s-section>
          </BlockStack>

          {suggestions.length > 0 && (
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">Suggested Settlements</Text>
              <List type="bullet">
                {suggestions.map((suggestion, index) => (
                  <List.Item key={index}>
                    <Text as="span">
                      {suggestion.from} → {suggestion.to}: ${suggestion.amount.toFixed(2)}
                    </Text>
                  </List.Item>
                ))}
              </List>
            </BlockStack>
          )}

          {suggestions.length === 0 && (
            <Text as="p" tone="success">Everyone is settled up!</Text>
          )}
          </BlockStack>
        </Card>
      </BlockStack>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Settlement"
        primaryAction={{
          content: 'Record Settlement',
          onAction: handleAddSettlement,
          loading: adding,
          disabled: !newSettlement.from || !newSettlement.to || !newSettlement.amount,
          tone: 'success'
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
              label="From (who is paying)"
              options={personOptions}
              value={newSettlement.from}
              onChange={(value) => setNewSettlement({ ...newSettlement, from: value })}
            />
            
            <Select
              label="To (who is receiving)"
              options={personOptions}
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
    </div>
  )
}
