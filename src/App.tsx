import { useState, useEffect } from 'react'
import { AppProvider, Text, Icon } from '@shopify/polaris'
import { HomeFilledIcon, PersonFilledIcon, ReceiptIcon, BankFilledIcon, ChartVerticalFilledIcon, SearchIcon, SettingsFilledIcon } from '@shopify/polaris-icons'
import { supabase, type Occasion } from './lib/supabase'
import Dashboard from './components/Dashboard'
import OccasionSelector from './components/OccasionSelector'
import SearchModal from './components/SearchModal'
import SettingsLayout from './components/SettingsLayout'

function App() {
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [currentOccasion, setCurrentOccasion] = useState<Occasion | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState(0)
  const [occasionPopoverActive, setOccasionPopoverActive] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)

  useEffect(() => {
    loadOccasions()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setSearchModalOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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


  const navigationItems = [
    { label: 'Dashboard', icon: HomeFilledIcon, onClick: () => setSelectedTab(0) },
    { label: 'People', icon: PersonFilledIcon, onClick: () => setSelectedTab(1) },
    { label: 'Expenses', icon: ReceiptIcon, onClick: () => setSelectedTab(2) },
    { label: 'Balances', icon: BankFilledIcon, onClick: () => setSelectedTab(3) },
    { label: 'Statistics', icon: ChartVerticalFilledIcon, onClick: () => setSelectedTab(4) },
    { label: 'Settings', icon: SettingsFilledIcon, onClick: () => setSelectedTab(5), pushToBottom: true }
  ]

  return (
    <AppProvider i18n={{}}>
      <style>{`
        #occasion-menu s-section:first-child s-button {
          --s-button-icon-display: none;
        }
      `}</style>
      <div id="app-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div id="top-bar" style={{
          height: '56px',
          backgroundColor: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          gap: '16px',
          flexShrink: 0,
          position: 'relative'
        }}>
          <div style={{ position: 'absolute', left: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 210 210" fill="none">
              <path fill="#ffffff" fillRule="evenodd" clipRule="evenodd" d="M206.398,30.286c-4.502-12.394-14.307-22.189-26.713-26.687C168.48,0,158.075,0,136.865,0h-63.63   c-21.11,0-31.615,0-42.92,3.498C17.909,7.996,8.104,17.792,3.602,30.186C0,41.58,0,52.075,0,73.165v63.57   c0,21.19,0,31.585,3.502,42.98c4.502,12.394,14.307,22.189,26.713,26.687C41.62,210,52.125,210,73.135,210h63.63   c21.11,0,31.615,0,42.92-3.598c12.406-4.498,22.211-14.293,26.713-26.687C210,168.32,210,157.825,210,136.735v-63.47   C210,52.175,210,41.68,206.398,30.286z M151.472,71.866l-12.106,9.895c-1.101,0.9-2.601,0.7-3.402-0.4   c-6.203-7.596-15.807-11.894-26.312-11.894c-11.706,0-19.009,5.098-19.009,12.294c-0.2,6.097,5.503,9.196,23.011,12.994   c22.111,4.698,32.215,13.893,32.215,29.386c0,19.391-15.808,33.684-40.519,35.283l-2.401,11.495   c-0.2,1.099-1.201,1.899-2.401,1.899H81.539c-1.601,0-2.701-1.499-2.401-2.999l3.001-12.794   c-12.206-3.498-22.111-10.295-27.813-18.591c-0.7-1.099-0.5-2.499,0.5-3.298l13.206-10.395c1.101-0.9,2.701-0.6,3.502,0.5   c7.003,9.795,17.808,15.593,30.815,15.593c11.706,0,20.51-5.697,20.51-13.893c0-6.297-4.402-9.196-19.309-12.294   c-25.412-5.497-35.517-14.793-35.517-30.286c0-17.991,15.107-31.485,37.918-33.284l2.501-11.894c0.2-1.099,1.201-1.899,2.401-1.899   h18.709c1.501,0,2.701,1.399,2.401,2.899l-2.901,13.294c9.805,2.999,17.808,8.396,22.811,15.093   C152.673,69.567,152.473,71.066,151.472,71.866z"></path>
            </svg>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Minty</span>
          </div>

          <div style={{ width: '100%', maxWidth: '600px' }}>
            <button
              onClick={() => setSearchModalOpen(true)}
              style={{
                all: 'unset',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                height: '32px',
                padding: '0 12px',
                backgroundColor: '#303030',
                border: '1px solid #474747',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#5c5f62'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#474747'}
            >
              <Icon source={SearchIcon} tone="base" />
              <span style={{ flex: 1, color: '#8c9196', fontSize: '13px' }}>Search</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <kbd style={{
                  padding: '2px 6px',
                  backgroundColor: '#474747',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#ffffff',
                  fontFamily: 'monospace'
                }}>⌘</kbd>
                <kbd style={{
                  padding: '2px 6px',
                  backgroundColor: '#474747',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#ffffff',
                  fontFamily: 'monospace'
                }}>K</kbd>
              </div>
            </button>
          </div>

          <div style={{ position: 'absolute', right: '16px' }}>
            <s-button commandFor="occasion-menu">
              <span>{currentOccasion?.name || 'Select Occasion'}</span>
            </s-button>

            <s-menu id="occasion-menu" accessibilityLabel="Occasion menu">
              <s-section>
                {occasions.filter(occasion => occasion.id !== currentOccasion?.id).map(occasion => (
                  <s-button 
                    key={occasion.id}
                    onClick={() => handleOccasionChange(occasion.id)}
                  >
                    {occasion.name}
                  </s-button>
                ))}
              </s-section>
              <s-section>
                <s-button onClick={() => setSelectedTab(5)}>
                  Settings
                </s-button>
                <s-button onClick={() => setCreateModalOpen(true)}>
                  New Occasion
                </s-button>
              </s-section>
            </s-menu>
          </div>
        </div>

        <div id="main-container" style={{ display: 'flex', flex: 1, minHeight: 0, backgroundColor: '#1a1a1a' }}>
          <div id="content-frame" style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            backgroundColor: '#f9fafb',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            overflow: 'hidden'
          }}>
            {selectedTab === 5 ? (
              !loading && currentOccasion && (
                <SettingsLayout 
                  occasionId={currentOccasion.id}
                  occasions={occasions}
                  currentOccasion={currentOccasion}
                  onUpdate={loadOccasions}
                  onOccasionChange={handleOccasionChange}
                  onBack={() => setSelectedTab(0)}
                />
              )
            ) : (
              <>
                <div id="sidebar" style={{
                  width: '224px',
                  backgroundColor: '#EBEBEB',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0
                }}>
                  <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <ul style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: '8px 12px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {navigationItems.map((item, index) => (
                        <li key={item.label} style={{ marginBottom: '4px', marginTop: item.pushToBottom ? 'auto' : '0' }}>
                          <div style={{ position: 'relative' }}>
                            <a
                              onClick={(e) => {
                                e.preventDefault()
                                item.onClick()
                              }}
                              href="#"
                              tabIndex={0}
                              aria-disabled="false"
                              style={{
                                all: 'unset',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                minHeight: '32px',
                                borderRadius: '8px',
                                background: selectedTab === index ? '#ffffff' : 'transparent',
                                cursor: 'pointer',
                                textDecoration: 'none',
                                boxSizing: 'border-box',
                                position: 'relative',
                                transition: 'background-color 0.2s ease',
                                width: '100%',
                                boxShadow: selectedTab === index ? '0 1px 0 0 rgba(0,0,0,.05), 0 -1px 0 0 rgba(0,0,0,.05)' : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (selectedTab !== index) {
                                  e.currentTarget.style.background = '#e3e5e7'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedTab !== index) {
                                  e.currentTarget.style.background = 'transparent'
                                }
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '20px',
                                height: '20px',
                                flexShrink: 0
                              }}>
                                <Icon source={item.icon} tone="base" />
                              </div>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#202223',
                                lineHeight: '20px'
                              }}>{item.label}</span>
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>

                <div id="main-content" style={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  backgroundColor: '#F1F1F1'
                }}>
                  <div style={{ padding: '24px' }}>
                    {!loading && currentOccasion && (
                      <Dashboard occasionId={currentOccasion.id} selectedTab={selectedTab} onTabChange={setSelectedTab} />
                    )}
                    
                    {!loading && !currentOccasion && (
                      <Text as="p">Create an occasion to get started!</Text>
                    )}
                  </div>
                </div>
              </>
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

        <SearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          occasionId={currentOccasion?.id || null}
        />
      </div>
    </AppProvider>
  )
}

export default App
