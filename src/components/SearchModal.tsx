import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Text, Icon } from '@shopify/polaris'
import { SearchIcon } from '@shopify/polaris-icons'
import { supabase, type Person, type Expense, type Settlement, type Subgroup } from '../lib/supabase'

type SearchFilter = 'all' | 'people' | 'expenses' | 'settlements' | 'subgroups'

interface SearchResult {
  id: string
  type: 'person' | 'expense' | 'settlement' | 'subgroup'
  title: string
  subtitle?: string
  data: Person | Expense | Settlement | Subgroup
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
  occasionId: string | null
}

export default function SearchModal({ open, onClose, occasionId }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('recentSearches')
    if (stored) {
      setRecentSearches(JSON.parse(stored))
    }
  }, [])

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !occasionId) {
      setResults([])
      return
    }

    setLoading(true)
    const searchResults: SearchResult[] = []

    try {
      if (activeFilter === 'all' || activeFilter === 'people') {
        const { data: people } = await supabase
          .from('people')
          .select('*')
          .eq('occasion_id', occasionId)
          .ilike('name', `%${query}%`)
        
        if (people) {
          searchResults.push(...people.map(p => ({
            id: p.id,
            type: 'person' as const,
            title: p.name,
            subtitle: 'Person',
            data: p
          })))
        }
      }

      if (activeFilter === 'all' || activeFilter === 'expenses') {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('occasion_id', occasionId)
          .or(`description.ilike.%${query}%,category.ilike.%${query}%,note.ilike.%${query}%`)
        
        if (expenses) {
          searchResults.push(...expenses.map(e => ({
            id: e.id,
            type: 'expense' as const,
            title: e.description,
            subtitle: `$${e.amount.toFixed(2)} • ${e.category}`,
            data: e
          })))
        }
      }

      if (activeFilter === 'all' || activeFilter === 'settlements') {
        const { data: settlements } = await supabase
          .from('settlements')
          .select('*')
          .eq('occasion_id', occasionId)
        
        if (settlements) {
          searchResults.push(...settlements.map(s => ({
            id: s.id,
            type: 'settlement' as const,
            title: `Settlement: $${s.amount.toFixed(2)}`,
            subtitle: new Date(s.date).toLocaleDateString(),
            data: s
          })))
        }
      }

      if (activeFilter === 'all' || activeFilter === 'subgroups') {
        const { data: subgroups } = await supabase
          .from('subgroups')
          .select('*')
          .eq('occasion_id', occasionId)
          .ilike('name', `%${query}%`)
        
        if (subgroups) {
          searchResults.push(...subgroups.map(sg => ({
            id: sg.id,
            type: 'subgroup' as const,
            title: sg.name,
            subtitle: 'Subgroup',
            data: sg
          })))
        }
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [occasionId, activeFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const handleSelectResult = (result: SearchResult) => {
    if (searchQuery && !recentSearches.includes(searchQuery)) {
      const updated = [searchQuery, ...recentSearches].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }
    onClose()
  }

  const clearHistory = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && !(e.target as Element).closest('.search-expanded-container')) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose])

  const groupedResults = results.reduce((acc, result) => {
    const type = result.type
    if (!acc[type]) acc[type] = []
    acc[type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  if (!open) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '64px'
    }}>
      <div 
        className="search-expanded-container"
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
          maxHeight: '520px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #e1e3e5' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center' }}>
              <Icon source={SearchIcon} tone="base" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search"
              style={{
                all: 'unset',
                width: '100%',
                height: '40px',
                paddingLeft: '40px',
                paddingRight: '12px',
                fontSize: '15px',
                color: '#202223',
                backgroundColor: '#f6f6f7',
                borderRadius: '8px',
                border: '2px solid transparent',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#005bd3'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {(['all', 'people', 'expenses', 'settlements', 'subgroups'] as SearchFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  all: 'unset',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  backgroundColor: activeFilter === filter ? '#e3e5e7' : '#f6f6f7',
                  color: '#202223',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (activeFilter !== filter) {
                    e.currentTarget.style.backgroundColor = '#ebebeb'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilter !== filter) {
                    e.currentTarget.style.backgroundColor = '#f6f6f7'
                  }
                }}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {!searchQuery && recentSearches.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Text as="h3" variant="headingSm">Recent searches</Text>
                <button
                  onClick={clearHistory}
                  style={{
                    all: 'unset',
                    color: '#005bd3',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Clear history
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(search)}
                    style={{
                      all: 'unset',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f6f7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Icon source={SearchIcon} tone="subdued" />
                    <Text as="span">{search}</Text>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery && !loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Text as="p" tone="subdued">No results found</Text>
            </div>
          )}

          {searchQuery && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <Text as="h3" variant="headingSm" fontWeight="semibold" tone="subdued">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {items.map(result => (
                      <button
                        key={result.id}
                        onClick={() => handleSelectResult(result)}
                        style={{
                          all: 'unset',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f6f7'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Text as="span" fontWeight="semibold">{result.title}</Text>
                        {result.subtitle && (
                          <Text as="span" tone="subdued" variant="bodySm">{result.subtitle}</Text>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
