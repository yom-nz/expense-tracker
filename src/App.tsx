import { useState, useEffect } from 'react'
import { AppProvider, Text, ActionList, Popover } from '@shopify/polaris'
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

  return (
    <AppProvider i18n={{}}>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div style={{
          width: '240px',
          backgroundColor: '#f9fafb',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '20px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <DollarSign size={24} color="#008060" />
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#202223' }}>Expense Tracker</span>
          </div>

          <nav style={{ flex: 1, padding: '16px 8px' }}>
            {navigationItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  marginBottom: '4px',
                  border: 'none',
                  borderRadius: '8px',
                  background: selectedTab === index ? '#f1f1f1' : 'transparent',
                  color: selectedTab === index ? '#202223' : '#6d7175',
                  fontSize: '14px',
                  fontWeight: selectedTab === index ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedTab !== index) {
                    e.currentTarget.style.background = '#f6f6f7'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTab !== index) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <Popover
              active={occasionPopoverActive}
              activator={
                <button
                  onClick={toggleOccasionPopover}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#202223',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{currentOccasion?.name || 'Select Occasion'}</span>
                  <span style={{ fontSize: '10px' }}>▼</span>
                </button>
              }
              onClose={toggleOccasionPopover}
              preferredAlignment="right"
            >
              <ActionList sections={occasionActions} />
            </Popover>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f9fafb' }}>
          <div style={{ padding: '24px' }}>
            {!loading && currentOccasion && (
              <Dashboard occasionId={currentOccasion.id} selectedTab={selectedTab} onTabChange={setSelectedTab} />
            )}
            
            {!loading && !currentOccasion && (
              <div style={{ marginTop: '2rem' }}>
                <Text as="p">Create an occasion to get started!</Text>
              </div>
            )}
          </div>
        </div>

        <OccasionSelector
          occasions={occasions}
          currentOccasion={currentOccasion}
          onOccasionChange={handleOccasionChange}
          onOccasionCreated={handleOccasionCreated}
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      </div>
    </AppProvider>
  )
}

export default App
