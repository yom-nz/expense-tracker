import { useState } from 'react'
import { Card, Select, Button, Modal, TextField, InlineStack } from '@shopify/polaris'
import { supabase, type Occasion } from '../lib/supabase'

interface Props {
  occasions: Occasion[]
  currentOccasion: Occasion | null
  onOccasionChange: (occasionId: string) => void
  onOccasionCreated: () => void
}

export default function OccasionSelector({ occasions, currentOccasion, onOccasionChange, onOccasionCreated }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newOccasionName, setNewOccasionName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateOccasion = async () => {
    if (!newOccasionName.trim()) return

    setCreating(true)
    try {
      const { error } = await supabase
        .from('occasions')
        .insert([{ name: newOccasionName.trim() }])

      if (error) throw error

      setNewOccasionName('')
      setIsModalOpen(false)
      onOccasionCreated()
    } catch (error) {
      console.error('Error creating occasion:', error)
    } finally {
      setCreating(false)
    }
  }

  const options = occasions.map(c => ({
    label: c.name,
    value: c.id
  }))

  return (
    <>
      <Card>
        <InlineStack gap="400" align="space-between" blockAlign="center">
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <Select
              label="Occasion"
              options={options}
              value={currentOccasion?.id || ''}
              onChange={onOccasionChange}
            />
          </div>
          <Button onClick={() => setIsModalOpen(true)}>New Occasion</Button>
        </InlineStack>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Occasion"
        primaryAction={{
          content: 'Create',
          onAction: handleCreateOccasion,
          loading: creating,
          disabled: !newOccasionName.trim()
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
            label="Occasion Name"
            value={newOccasionName}
            onChange={setNewOccasionName}
            placeholder="e.g., Rarotonga Trip, Weekend Dinner"
            autoComplete="off"
          />
        </Modal.Section>
      </Modal>
    </>
  )
}
