import { useMemo } from 'react'
import { Card, BlockStack, Text, DataTable } from '@shopify/polaris'
import { Expense, Person } from '../lib/supabase'

interface Props {
  expenses: Expense[]
  people: Person[]
}

export default function StatsView({ expenses, people }: Props) {
  const stats = useMemo(() => {
    const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
    
    const byCategory: Record<string, number> = {}
    const byPerson: Record<string, number> = {}
    
    expenses.forEach(expense => {
      byCategory[expense.category] = (byCategory[expense.category] || 0) + Number(expense.amount)
      
      if (expense.payer_person_id) {
        const payer = people.find(p => p.id === expense.payer_person_id)
        if (payer) {
          byPerson[payer.name] = (byPerson[payer.name] || 0) + Number(expense.amount)
        }
      }
    })

    const categoryRows = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => [
        category,
        `$${amount.toFixed(2)}`,
        `${((amount / totalSpent) * 100).toFixed(1)}%`
      ])

    const personRows = Object.entries(byPerson)
      .sort(([, a], [, b]) => b - a)
      .map(([person, amount]) => [
        person,
        `$${amount.toFixed(2)}`
      ])

    return {
      totalSpent,
      numExpenses: expenses.length,
      categoryRows,
      personRows
    }
  }, [expenses, people])

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">Statistics</Text>
          
          <BlockStack gap="200">
            <Text as="p" variant="bodyLg">Total Expenses: {stats.numExpenses}</Text>
            <Text as="p" variant="bodyLg">Total Spent: ${stats.totalSpent.toFixed(2)}</Text>
          </BlockStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">By Category</Text>
          {stats.categoryRows.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'numeric', 'numeric']}
              headings={['Category', 'Amount', 'Percentage']}
              rows={stats.categoryRows}
            />
          ) : (
            <Text as="p" tone="subdued">No expenses yet</Text>
          )}
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">Total Paid By Person</Text>
          {stats.personRows.length > 0 ? (
            <DataTable
              columnContentTypes={['text', 'numeric']}
              headings={['Person', 'Total Paid']}
              rows={stats.personRows}
            />
          ) : (
            <Text as="p" tone="subdued">No expenses yet</Text>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  )
}
