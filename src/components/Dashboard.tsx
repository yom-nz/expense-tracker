import { useState, useEffect } from 'react'
import { Card, Text, InlineStack, BlockStack, Button } from '@shopify/polaris'
import { supabase, type Person, type Expense, type Settlement } from '../lib/supabase'
import PeopleManager from './PeopleManager'
import ExpenseManager from './ExpenseManager'
import BalancesView from './BalancesView'
import StatsView from './StatsView'

interface Props {
  occasionId: string
  selectedTab: number
  onTabChange: (tab: number) => void
}

export default function Dashboard({ occasionId, selectedTab, onTabChange }: Props) {
  const [people, setPeople] = useState<Person[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [stats, setStats] = useState({
    numPeople: 0,
    numExpenses: 0,
    totalSpent: 0
  })

  useEffect(() => {
    loadData()
  }, [occasionId])

  const loadData = async () => {
    await Promise.all([
      loadPeople(),
      loadExpenses(),
      loadSettlements()
    ])
  }

  const loadPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('occasion_id', occasionId)

      if (error) throw error
      setPeople(data || [])
    } catch (error) {
      console.error('Error loading people:', error)
    }
  }

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('occasion_id', occasionId)
        .order('date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
      
      const total = (data || []).reduce((sum, exp) => sum + Number(exp.amount), 0)
      setStats(prev => ({ ...prev, numExpenses: data?.length || 0, totalSpent: total }))
    } catch (error) {
      console.error('Error loading expenses:', error)
    }
  }

  const loadSettlements = async () => {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('occasion_id', occasionId)
        .order('date', { ascending: false })

      if (error) throw error
      setSettlements(data || [])
    } catch (error) {
      console.error('Error loading settlements:', error)
    }
  }


  return (
    <div>
        {selectedTab === 0 && (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <BlockStack gap="400">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text as="h2" variant="headingLg">Dashboard</Text>
                <InlineStack gap="200">
                  <Button variant="primary" onClick={() => onTabChange(2)}>Add Expense</Button>
                  <Button variant="primary" onClick={() => onTabChange(1)}>Manage People</Button>
                </InlineStack>
              </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '16px'
            }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">People</Text>
                  <Text as="h3" variant="headingXl">{people.length}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text as="span" variant="bodySm" tone="success">↑ {people.length > 0 ? '100%' : '0%'}</Text>
                  </div>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Total Expenses</Text>
                  <Text as="h3" variant="headingXl">${stats.totalSpent.toFixed(2)}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text as="span" variant="bodySm" tone="success">↑ {expenses.length > 0 ? '100%' : '0%'}</Text>
                  </div>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Number of Expenses</Text>
                  <Text as="h3" variant="headingXl">{expenses.length}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text as="span" variant="bodySm" tone="subdued">Total tracked</Text>
                  </div>
                </BlockStack>
              </Card>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '16px'
            }}>
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Recent Expenses</Text>
                  {expenses.slice(0, 3).length > 0 ? (
                    <BlockStack gap="100">
                      {expenses.slice(0, 3).map(exp => (
                        <button
                          key={exp.id}
                          onClick={() => onTabChange(2)}
                          style={{
                            all: 'unset',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f6f7'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div>
                            <Text as="p" variant="bodyMd" fontWeight="semibold">{exp.description}</Text>
                            <Text as="p" variant="bodySm" tone="subdued">{exp.category}</Text>
                          </div>
                          <Text as="p" variant="bodyMd" fontWeight="semibold">${Number(exp.amount).toFixed(2)}</Text>
                        </button>
                      ))}
                    </BlockStack>
                  ) : (
                    <Text as="p" tone="subdued">No expenses yet</Text>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Top Spenders</Text>
                  {people.slice(0, 3).length > 0 ? (
                    <BlockStack gap="100">
                      {people.slice(0, 3).map(person => {
                        const personExpenses = expenses.filter(e => e.payer_person_id === person.id)
                        const total = personExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
                        return (
                          <button
                            key={person.id}
                            onClick={() => onTabChange(1)}
                            style={{
                              all: 'unset',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f6f7'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Text as="p" variant="bodyMd">{person.name}</Text>
                            <Text as="p" variant="bodyMd" fontWeight="semibold">${total.toFixed(2)}</Text>
                          </button>
                        )
                      })}
                    </BlockStack>
                  ) : (
                    <Text as="p" tone="subdued">No people yet</Text>
                  )}
                </BlockStack>
              </Card>
            </div>
            </BlockStack>
          </div>
        )}
        
        {selectedTab === 1 && (
          <PeopleManager occasionId={occasionId} onUpdate={loadData} />
        )}
        
        {selectedTab === 2 && (
          <ExpenseManager 
            occasionId={occasionId} 
            people={people}
            onUpdate={loadExpenses}
          />
        )}
        
        {selectedTab === 3 && (
          <BalancesView 
            occasionId={occasionId}
            people={people}
            expenses={expenses}
            settlements={settlements}
            onSettlementAdded={loadSettlements}
          />
        )}
        
        {selectedTab === 4 && (
          <StatsView expenses={expenses} people={people} />
        )}
    </div>
  )
}
