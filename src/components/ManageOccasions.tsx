import { useState } from 'react'
import { Card, Text, BlockStack, Button, Modal, Banner } from '@shopify/polaris'
import { supabase, type Occasion } from '../lib/supabase'

interface Props {
  occasions: Occasion[]
  currentOccasion: Occasion | null
  onUpdate: () => void
  onOccasionChange: (occasionId: string) => void
}

export default function ManageOccasions({ occasions, currentOccasion, onUpdate, onOccasionChange }: Props) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [occasionToDelete, setOccasionToDelete] = useState<Occasion | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteClick = (occasion: Occasion) => {
    setOccasionToDelete(occasion)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!occasionToDelete) return

    setDeleting(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('occasions')
        .delete()
        .eq('id', occasionToDelete.id)

      if (deleteError) throw deleteError

      if (currentOccasion?.id === occasionToDelete.id) {
        const remainingOccasions = occasions.filter(o => o.id !== occasionToDelete.id)
        if (remainingOccasions.length > 0) {
          onOccasionChange(remainingOccasions[0].id)
        }
      }

      onUpdate()
      setDeleteModalOpen(false)
      setOccasionToDelete(null)
    } catch (err) {
      console.error('Error deleting occasion:', err)
      setError('Failed to delete occasion')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="400">
        <Text as="h2" variant="headingLg">Manage Occasions</Text>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <Card padding="0">
          <s-section padding="none">
            <s-table>
              <s-table-header-row>
                <s-table-header>Icon</s-table-header>
                <s-table-header>Name</s-table-header>
                <s-table-header>Description</s-table-header>
                <s-table-header>Created</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {occasions.map((occasion) => (
                  <s-table-row key={occasion.id}>
                    <s-table-cell>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        📅
                      </Text>
                    </s-table-cell>
                    <s-table-cell>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {occasion.name}
                      </Text>
                    </s-table-cell>
                    <s-table-cell>
                      <Text as="span" variant="bodyMd" tone="subdued">
                        -
                      </Text>
                    </s-table-cell>
                    <s-table-cell>
                      <Text as="span" variant="bodyMd" tone="subdued">
                        {formatDate(occasion.created_at)}
                      </Text>
                    </s-table-cell>
                    <s-table-cell>
                      <Button
                        variant="primary"
                        tone="critical"
                        onClick={() => handleDeleteClick(occasion)}
                        disabled={currentOccasion?.id === occasion.id && occasions.length === 1}
                      >
                        Delete
                      </Button>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-section>
        </Card>
      </BlockStack>

      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setOccasionToDelete(null)
        }}
        title="Delete Occasion"
        primaryAction={{
          content: 'Delete',
          onAction: handleDeleteConfirm,
          loading: deleting,
          destructive: true
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setDeleteModalOpen(false)
              setOccasionToDelete(null)
            }
          }
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete "{occasionToDelete?.name}"? This will also delete all associated people, expenses, and settlements. This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </div>
  )
}
