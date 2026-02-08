import { useState, useEffect } from 'react'
import { Card, Text, InlineStack, BlockStack, Tabs, Button } from '@shopify/polaris'
import { supabase, type Person, Expense, Settlement } from '../lib/supabase'
import PeopleManager from './PeopleManager'
import ExpenseManager from './ExpenseManager'
import BalancesView from './BalancesView'
import StatsView from './StatsView'

interface Props {
  collectionId: string
}

export default function Dashboard({ collectionId }: Props) {
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
  }, [collectionId])

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
        .eq('collection_id', collectionId)

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
        .eq('collection_id', collectionId)
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
        .eq('collection_id', collectionId)
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
                  <Button onClick={() => setSelected(2)}>Add Expense</Button>
                  <Button onClick={() => setSelected(1)}>Manage People</Button>
                  <Button onClick={() => setSelected(3)}>View Balances</Button>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        )}
        
        {selected === 1 && (
          <PeopleManager collectionId={collectionId} onUpdate={loadPeople} />
        )}
        
        {selected === 2 && (
          <ExpenseManager 
            collectionId={collectionId} 
            people={people}
            onUpdate={loadExpenses}
          />
        )}
        
        {selected === 3 && (
          <BalancesView 
            collectionId={collectionId}
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
