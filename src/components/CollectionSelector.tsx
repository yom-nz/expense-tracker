import { useState } from 'react'
import { Card, Select, Button, Modal, TextField, InlineStack } from '@shopify/polaris'
import { supabase, Collection } from '../lib/supabase'

interface Props {
  collections: Collection[]
  currentCollection: Collection | null
  onCollectionChange: (collectionId: string) => void
  onCollectionCreated: () => void
}

export default function CollectionSelector({ collections, currentCollection, onCollectionChange, onCollectionCreated }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return

    setCreating(true)
    try {
      const { error } = await supabase
        .from('collections')
        .insert([{ name: newCollectionName.trim() }])

      if (error) throw error

      setNewCollectionName('')
      setIsModalOpen(false)
      onCollectionCreated()
    } catch (error) {
      console.error('Error creating collection:', error)
    } finally {
      setCreating(false)
    }
  }

  const options = collections.map(c => ({
    label: c.name,
    value: c.id
  }))

  return (
    <>
      <Card>
        <InlineStack gap="400" align="space-between" blockAlign="center">
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <Select
              label="Collection"
              options={options}
              value={currentCollection?.id || ''}
              onChange={onCollectionChange}
            />
          </div>
          <Button onClick={() => setIsModalOpen(true)}>New Collection</Button>
        </InlineStack>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Collection"
        primaryAction={{
          content: 'Create',
          onAction: handleCreateCollection,
          loading: creating,
          disabled: !newCollectionName.trim()
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setIsModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <TextField
            label="Collection Name"
            value={newCollectionName}
            onChange={setNewCollectionName}
            placeholder="e.g., Rarotonga Trip, Weekend Dinner"
            autoComplete="off"
          />
        </Modal.Section>
      </Modal>
    </>
  )
}
