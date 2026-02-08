import { useState } from 'react'
import { Icon } from '@shopify/polaris'
import { SettingsFilledIcon, ListBulletedFilledIcon, ArrowLeftIcon } from '@shopify/polaris-icons'
import { type Occasion } from '../lib/supabase'
import OccasionSettings from './OccasionSettings'
import ManageOccasions from './ManageOccasions'

interface Props {
  occasionId: string
  occasions: Occasion[]
  currentOccasion: Occasion | null
  onUpdate: () => void
  onOccasionChange: (occasionId: string) => void
  onBack: () => void
}

export default function SettingsLayout({ occasionId, occasions, currentOccasion, onUpdate, onOccasionChange, onBack }: Props) {
  const [selectedTab, setSelectedTab] = useState(0)

  const navigationItems = [
    { label: 'Occasion Settings', icon: SettingsFilledIcon, onClick: () => setSelectedTab(0) },
    { label: 'Manage Occasions', icon: ListBulletedFilledIcon, onClick: () => setSelectedTab(1) }
  ]

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div id="settings-sidebar" style={{
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
            <li style={{ marginBottom: '12px' }}>
              <a
                onClick={(e) => {
                  e.preventDefault()
                  onBack()
                }}
                href="#"
                tabIndex={0}
                style={{
                  all: 'unset',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  minHeight: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                  transition: 'background-color 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e3e5e7'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  flexShrink: 0
                }}>
                  <Icon source={ArrowLeftIcon} tone="base" />
                </div>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#202223',
                  lineHeight: '20px'
                }}>Back to Main Menu</span>
              </a>
            </li>
            
            {navigationItems.map((item, index) => (
              <li key={item.label} style={{ marginBottom: '4px' }}>
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

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {selectedTab === 0 && (
          <OccasionSettings 
            occasionId={occasionId} 
            onUpdate={onUpdate} 
          />
        )}
        
        {selectedTab === 1 && (
          <ManageOccasions 
            occasions={occasions}
            currentOccasion={currentOccasion}
            onUpdate={onUpdate}
            onOccasionChange={onOccasionChange}
          />
        )}
      </div>
    </div>
  )
}
