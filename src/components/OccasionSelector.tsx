import { useState } from 'react'
import { Modal, TextField } from '@shopify/polaris'
import { supabase, type Occasion } from '../lib/supabase'

interface Props {
  occasions: Occasion[]
  currentOccasion: Occasion | null
  onOccasionChange: (occasionId: string) => void
  onOccasionCreated: () => void
  isOpen: boolean
  onClose: () => void
}

export default function OccasionSelector({ onOccasionCreated, isOpen, onClose }: Props) {
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
      onOccasionCreated()
      onClose()
    } catch (error) {
      console.error('Error creating occasion:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal
        open={isOpen}
        onClose={onClose}
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
            onAction: onClose
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
  )
}
