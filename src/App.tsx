import { useState, useEffect } from 'react'
import { AppProvider, Text, ActionList, Popover, TextField } from '@shopify/polaris'
import { DollarSign, Search } from 'lucide-react'
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
  const [searchValue, setSearchValue] = useState('')

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
    { label: 'Dashboard', icon: 'home', onClick: () => setSelectedTab(0) },
    { label: 'People', icon: 'customers', onClick: () => setSelectedTab(1) },
    { label: 'Expenses', icon: 'receipt', onClick: () => setSelectedTab(2) },
    { label: 'Balances', icon: 'finances', onClick: () => setSelectedTab(3) },
    { label: 'Statistics', icon: 'chart-vertical', onClick: () => setSelectedTab(4) }
  ]

  return (
    <AppProvider i18n={{}}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{
          height: '56px',
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #303030',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '16px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '200px' }}>
            <DollarSign size={20} color="#ffffff" />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Expense Tracker</span>
          </div>

          <div style={{ flex: 1, maxWidth: '600px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c9196' }} />
              <input
                type="text"
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{
                  width: '100%',
                  height: '32px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  backgroundColor: '#303030',
                  border: '1px solid #474747',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <Popover
              active={occasionPopoverActive}
              activator={
                <button
                  onClick={toggleOccasionPopover}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #474747',
                    borderRadius: '8px',
                    background: '#303030',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{currentOccasion?.name || 'Select Occasion'}</span>
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

        <div style={{ display: 'flex', flex: 1, marginTop: '56px' }}>
          <div style={{
            width: '224px',
            backgroundColor: '#f9fafb',
            borderRight: '1px solid #e1e3e5',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: '56px',
            bottom: 0,
            overflowY: 'auto'
          }}>
            <nav style={{ padding: '12px 8px' }}>
              {navigationItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    marginBottom: '2px',
                    border: 'none',
                    borderRadius: '8px',
                    background: selectedTab === index ? '#e4e5e7' : 'transparent',
                    color: '#202223',
                    fontSize: '13px',
                    fontWeight: selectedTab === index ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTab !== index) {
                      e.currentTarget.style.background = '#f1f2f3'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTab !== index) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <s-icon type={item.icon} size="small" color={selectedTab === index ? 'base' : 'subdued'} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div style={{ flex: 1, marginLeft: '224px', overflow: 'auto', backgroundColor: '#f9fafb' }}>
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
