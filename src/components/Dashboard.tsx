import { useState, useEffect } from 'react'
import { Card, Text, InlineStack, BlockStack, Tabs, Button } from '@shopify/polaris'
import { supabase, type Person, type Expense, type Settlement } from '../lib/supabase'
import PeopleManager from './PeopleManager'
import ExpenseManager from './ExpenseManager'
import BalancesView from './BalancesView'
import StatsView from './StatsView'

interface Props {
  occasionId: string
}

export default function Dashboard({ occasionId }: Props) {
  const [selected, setSelected] = useState(0)
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

  const tabs = [
    {
      id: 'dashboard',
      content: 'Dashboard',
      panelID: 'dashboard-panel'
    },
    {
      id: 'people',
      content: 'People & Subgroups',
      panelID: 'people-panel'
    },
    {
      id: 'expenses',
      content: 'Expenses',
      panelID: 'expenses-panel'
    },
    {
      id: 'balances',
      content: 'Balances',
      panelID: 'balances-panel'
    },
    {
      id: 'stats',
      content: 'Statistics',
      panelID: 'stats-panel'
    }
  ]

  return (
    <div style={{ marginTop: '1rem' }}>
      <Tabs tabs={tabs} selected={selected} onSelect={setSelected}>
        {selected === 0 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Quick Stats</Text>
              <InlineStack gap="400">
                <Card>
                  <Text as="p" variant="bodyLg">{people.length} People</Text>
                </Card>
                <Card>
                  <Text as="p" variant="bodyLg">{expenses.length} Expenses</Text>
                </Card>
                <Card>
                  <Text as="p" variant="bodyLg">${stats.totalSpent.toFixed(2)} Total</Text>
                </Card>
              </InlineStack>
              
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">Quick Actions</Text>
                <InlineStack gap="200">
                  <Button variant="primary" tone="success" onClick={() => setSelected(2)}>Add Expense</Button>
                  <Button variant="primary" tone="success" onClick={() => setSelected(1)}>Manage People</Button>
                  <Button variant="primary" tone="success" onClick={() => setSelected(3)}>View Balances</Button>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        )}
        
        {selected === 1 && (
          <PeopleManager occasionId={occasionId} onUpdate={loadPeople} />
        )}
        
        {selected === 2 && (
          <ExpenseManager 
            occasionId={occasionId} 
            people={people}
            onUpdate={loadExpenses}
          />
        )}
        
        {selected === 3 && (
          <BalancesView 
            occasionId={occasionId}
            people={people}
            expenses={expenses}
            settlements={settlements}
            onSettlementAdded={loadSettlements}
          />
        )}
        
        {selected === 4 && (
          <StatsView expenses={expenses} people={people} />
        )}
      </Tabs>
    </div>
  )
}
