import { useState, useEffect } from 'react'
import { AppProvider, Page, Frame } from '@shopify/polaris'
import { supabase, Collection } from './lib/supabase'
import Dashboard from './components/Dashboard'
import CollectionSelector from './components/CollectionSelector'

function App() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCollections(data || [])
      if (data && data.length > 0 && !currentCollection) {
        setCurrentCollection(data[0])
      }
    } catch (error) {
      console.error('Error loading collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCollectionChange = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId)
    if (collection) {
      setCurrentCollection(collection)
    }
  }

  const handleCollectionCreated = () => {
    loadCollections()
  }

  return (
    <AppProvider i18n={{}}>
      <Frame>
        <Page
          title="Expense Tracker"
          subtitle={currentCollection ? currentCollection.name : 'No collection selected'}
        >
          <CollectionSelector
            collections={collections}
            currentCollection={currentCollection}
            onCollectionChange={handleCollectionChange}
            onCollectionCreated={handleCollectionCreated}
          />
          
          {!loading && currentCollection && (
            <Dashboard collectionId={currentCollection.id} />
          )}
          
          {!loading && !currentCollection && (
            <Page title="Welcome">
              <p>Create a collection to get started!</p>
            </Page>
          )}
        </Page>
      </Frame>
    </AppProvider>
  )
}

export default App
