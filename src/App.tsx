import { useState, useEffect } from 'react'
import { AppProvider, Frame, TopBar, InlineStack, Text } from '@shopify/polaris'
import { supabase, type Occasion } from './lib/supabase'
import Dashboard from './components/Dashboard'
import OccasionSelector from './components/OccasionSelector'

function App() {
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [currentOccasion, setCurrentOccasion] = useState<Occasion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOccasions()
  }, [])

  const loadOccasions = async () => {
    try {
      const { data, error } = await supabase
        .from('occasions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOccasions(data || [])
      if (data && data.length > 0 && !currentOccasion) {
        setCurrentOccasion(data[0])
      }
    } catch (error) {
      console.error('Error loading occasions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOccasionChange = (occasionId: string) => {
    const occasion = occasions.find(c => c.id === occasionId)
    if (occasion) {
      setCurrentOccasion(occasion)
    }
  }

  const handleOccasionCreated = () => {
    loadOccasions()
  }

  const topBarMarkup = (
    <TopBar
      showNavigationToggle={false}
    />
  )

  const logo = {
    width: 40,
    topBarSource: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23008060"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20" font-weight="bold"%3EE%3C/text%3E%3C/svg%3E',
    contextualSaveBarSource: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23008060"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20" font-weight="bold"%3EE%3C/text%3E%3C/svg%3E',
    url: '/',
    accessibilityLabel: 'Expense Tracker',
  }

  return (
    <AppProvider i18n={{}}>
      <Frame
        topBar={topBarMarkup}
        logo={logo}
      >
        <div style={{ padding: '1rem' }}>
          <InlineStack align="space-between" blockAlign="center" gap="400">
            <Text as="h1" variant="headingXl">Expense Tracker</Text>
            {currentOccasion && (
              <Text as="p" variant="bodyMd" tone="subdued">{currentOccasion.name}</Text>
            )}
          </InlineStack>

          <div style={{ marginTop: '1rem' }}>
            <OccasionSelector
              occasions={occasions}
              currentOccasion={currentOccasion}
              onOccasionChange={handleOccasionChange}
              onOccasionCreated={handleOccasionCreated}
            />
          </div>
          
          {!loading && currentOccasion && (
            <Dashboard occasionId={currentOccasion.id} />
          )}
          
          {!loading && !currentOccasion && (
            <div style={{ marginTop: '2rem' }}>
              <Text as="p">Create an occasion to get started!</Text>
            </div>
          )}
        </div>
      </Frame>
    </AppProvider>
  )
}

export default App
