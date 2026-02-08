import { useState, useEffect } from 'react'
import { AppProvider, Frame, TopBar, Text, ActionList, Popover } from '@shopify/polaris'
import { DollarSign } from 'lucide-react'
import { supabase, type Occasion } from './lib/supabase'
import Dashboard from './components/Dashboard'
import OccasionSelector from './components/OccasionSelector'

function App() {
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [currentOccasion, setCurrentOccasion] = useState<Occasion | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState(0)
  const [occasionPopoverActive, setOccasionPopoverActive] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

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
    setCreateModalOpen(false)
  }

  const toggleOccasionPopover = () => {
    setOccasionPopoverActive(!occasionPopoverActive)
  }

  const occasionPickerActivator = (
    <button
      onClick={toggleOccasionPopover}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '8px 16px',
        cursor: 'pointer',
        color: 'white',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      {currentOccasion?.name || 'Select Occasion'}
      <span style={{ fontSize: '10px' }}>▼</span>
    </button>
  )

  const occasionActions = [
    {
      items: occasions.map(occasion => ({
        content: occasion.name,
        active: currentOccasion?.id === occasion.id,
        onAction: () => {
          handleOccasionChange(occasion.id)
          setOccasionPopoverActive(false)
        }
      }))
    },
    {
      items: [
        {
          content: 'Create New Occasion',
          onAction: () => {
            setOccasionPopoverActive(false)
            setCreateModalOpen(true)
          }
        }
      ]
    }
  ]

  const navigationItems = [
    { label: 'Dashboard', onClick: () => setSelectedTab(0) },
    { label: 'People', onClick: () => setSelectedTab(1) },
    { label: 'Expenses', onClick: () => setSelectedTab(2) },
    { label: 'Balances', onClick: () => setSelectedTab(3) },
    { label: 'Statistics', onClick: () => setSelectedTab(4) }
  ]

  const topBarMarkup = (
    <TopBar
      showNavigationToggle={false}
      secondaryMenu={
        <Popover
          active={occasionPopoverActive}
          activator={occasionPickerActivator}
          onClose={toggleOccasionPopover}
          preferredAlignment="right"
        >
          <ActionList sections={occasionActions} />
        </Popover>
      }
    />
  )

  const logo = {
    width: 200,
    topBarSource: '',
    contextualSaveBarSource: '',
    url: '/',
    accessibilityLabel: 'Expense Tracker',
  }

  return (
    <AppProvider i18n={{}}>
      <Frame
        topBar={topBarMarkup}
        logo={{
          ...logo,
          topBarSource: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '16px', fontWeight: 600 }}>
              <DollarSign size={24} />
              <span>Expense Tracker</span>
            </div>
          ) as any
        }}
      >
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
            {navigationItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: selectedTab === index ? '#008060' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: selectedTab === index ? 600 : 400,
                  borderBottom: selectedTab === index ? '2px solid #008060' : '2px solid transparent',
                  marginBottom: '-10px'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {!loading && currentOccasion && (
            <Dashboard occasionId={currentOccasion.id} selectedTab={selectedTab} onTabChange={setSelectedTab} />
          )}
          
          {!loading && !currentOccasion && (
            <div style={{ marginTop: '2rem' }}>
              <Text as="p">Create an occasion to get started!</Text>
            </div>
          )}
        </div>

        <OccasionSelector
          occasions={occasions}
          currentOccasion={currentOccasion}
          onOccasionChange={handleOccasionChange}
          onOccasionCreated={handleOccasionCreated}
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      </Frame>
    </AppProvider>
  )
}

export default App
