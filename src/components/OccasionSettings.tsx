import { useState, useEffect } from 'react'
import { Card, Text, BlockStack, InlineStack, Button, TextField, Banner } from '@shopify/polaris'
import { supabase, type Occasion } from '../lib/supabase'

interface Props {
  occasionId: string
  onUpdate: () => void
}

export default function Settings({ occasionId, onUpdate }: Props) {
  const [occasion, setOccasion] = useState<Occasion | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOccasion()
  }, [occasionId])

  const loadOccasion = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('occasions')
        .select('*')
        .eq('id', occasionId)
        .single()

      if (error) throw error

      setOccasion(data)
      setName(data.name)
      setIcon(data.icon || '')
      setDescription(data.description || '')
    } catch (err) {
      console.error('Error loading occasion:', err)
      setError('Failed to load occasion settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return

    setSaving(true)
    setError(null)
    setShowSuccess(false)

    try {
      const { error } = await supabase
        .from('occasions')
        .update({
          name: name.trim(),
          icon: icon.trim() || null,
          description: description.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', occasionId)

      if (error) throw error

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      onUpdate()
    } catch (err) {
      console.error('Error saving occasion:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Text as="p">Loading settings...</Text>
      </div>
    )
  }

  if (!occasion) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Text as="p">Occasion not found</Text>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="400">
        <Text as="h2" variant="headingLg">Settings</Text>

        {showSuccess && (
          <Banner tone="success" onDismiss={() => setShowSuccess(false)}>
            Settings saved successfully!
          </Banner>
        )}

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">Occasion Details</Text>

            <TextField
              label="Occasion Name"
              value={name}
              onChange={setName}
              placeholder="e.g., Rarotonga Trip"
              autoComplete="off"
            />

            <TextField
              label="Icon (Emoji)"
              value={icon}
              onChange={setIcon}
              placeholder="e.g., 🏝️, ✈️, 🎉"
              autoComplete="off"
              helpText="Enter a single emoji to represent this occasion"
              maxLength={4}
            />

            <TextField
              label="Description (Optional)"
              value={description}
              onChange={setDescription}
              placeholder="Add a description for this occasion"
              autoComplete="off"
              multiline={3}
              maxLength={500}
              showCharacterCount
            />

            <InlineStack align="end">
              <Button 
                variant="primary" 
                onClick={handleSave} 
                loading={saving}
                disabled={!name.trim()}
              >
                Save Settings
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </div>
  )
}
