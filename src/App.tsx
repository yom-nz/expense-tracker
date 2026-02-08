import { useState, useEffect } from 'react'
import { AppProvider, Text, ActionList, Popover, TextField } from '@shopify/polaris'
import { Search } from 'lucide-react'
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
            <svg role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 210 210" fill="none">
              <path fill="#ffffff" fillRule="evenodd" clipRule="evenodd" d="M206.398,30.286c-4.502-12.394-14.307-22.189-26.713-26.687C168.48,0,158.075,0,136.865,0h-63.63   c-21.11,0-31.615,0-42.92,3.498C17.909,7.996,8.104,17.792,3.602,30.186C0,41.58,0,52.075,0,73.165v63.57   c0,21.19,0,31.585,3.502,42.98c4.502,12.394,14.307,22.189,26.713,26.687C41.62,210,52.125,210,73.135,210h63.63   c21.11,0,31.615,0,42.92-3.598c12.406-4.498,22.211-14.293,26.713-26.687C210,168.32,210,157.825,210,136.735v-63.47   C210,52.175,210,41.68,206.398,30.286z M151.472,71.866l-12.106,9.895c-1.101,0.9-2.601,0.7-3.402-0.4   c-6.203-7.596-15.807-11.894-26.312-11.894c-11.706,0-19.009,5.098-19.009,12.294c-0.2,6.097,5.503,9.196,23.011,12.994   c22.111,4.698,32.215,13.893,32.215,29.386c0,19.391-15.808,33.684-40.519,35.283l-2.401,11.495   c-0.2,1.099-1.201,1.899-2.401,1.899H81.539c-1.601,0-2.701-1.499-2.401-2.999l3.001-12.794   c-12.206-3.498-22.111-10.295-27.813-18.591c-0.7-1.099-0.5-2.499,0.5-3.298l13.206-10.395c1.101-0.9,2.701-0.6,3.502,0.5   c7.003,9.795,17.808,15.593,30.815,15.593c11.706,0,20.51-5.697,20.51-13.893c0-6.297-4.402-9.196-19.309-12.294   c-25.412-5.497-35.517-14.793-35.517-30.286c0-17.991,15.107-31.485,37.918-33.284l2.501-11.894c0.2-1.099,1.201-1.899,2.401-1.899   h18.709c1.501,0,2.701,1.399,2.401,2.899l-2.901,13.294c9.805,2.999,17.808,8.396,22.811,15.093   C152.673,69.567,152.473,71.066,151.472,71.866z"></path>
            </svg>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Minty</span>
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
