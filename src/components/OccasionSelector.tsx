import { useState } from 'react'
import { Modal, TextField, BlockStack, Banner } from '@shopify/polaris'
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
  const [newOccasionIcon, setNewOccasionIcon] = useState('')
  const [newOccasionDescription, setNewOccasionDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCreateOccasion = async () => {
    if (!newOccasionName.trim()) return

    setCreating(true)
    try {
      const { error } = await supabase
        .from('occasions')
        .insert([{ 
          name: newOccasionName.trim(),
          icon: newOccasionIcon.trim() || null,
          description: newOccasionDescription.trim() || null
        }])

      if (error) throw error

      setNewOccasionName('')
      setNewOccasionIcon('')
      setNewOccasionDescription('')
      onOccasionCreated()
      onClose()
    } catch (error) {
      console.error('Error creating occasion:', error)
      setErrorMessage('Failed to create occasion. Please try again.')
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
          {errorMessage && (
            <Banner tone="critical" onDismiss={() => setErrorMessage(null)}>
              {errorMessage}
            </Banner>
          )}
          
          <BlockStack gap="400">
            <TextField
              label="Occasion Name"
              value={newOccasionName}
              onChange={setNewOccasionName}
              placeholder="e.g., Rarotonga Trip, Weekend Dinner"
              autoComplete="off"
            />
            
            <TextField
              label="Icon (Emoji)"
              value={newOccasionIcon}
              onChange={setNewOccasionIcon}
              placeholder="e.g., 🏝️, ✈️, 🎉"
              autoComplete="off"
              helpText="Enter a single emoji to represent this occasion"
              maxLength={4}
            />
            
            <TextField
              label="Description (Optional)"
              value={newOccasionDescription}
              onChange={setNewOccasionDescription}
              placeholder="Add a description for this occasion"
              autoComplete="off"
              multiline={3}
              maxLength={500}
              showCharacterCount
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
  )
}
