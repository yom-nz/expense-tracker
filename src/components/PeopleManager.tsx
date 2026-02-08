import { useState, useEffect } from 'react'
import { Card, TextField, Button, InlineStack, BlockStack, Text, Modal, Checkbox } from '@shopify/polaris'
import { supabase, type Person, type Subgroup, type SubgroupMember } from '../lib/supabase'

interface Props {
  occasionId: string
  onUpdate: () => void
}

export default function PeopleManager({ occasionId, onUpdate }: Props) {
  const [people, setPeople] = useState<Person[]>([])
  const [subgroups, setSubgroups] = useState<Subgroup[]>([])
  const [subgroupMembers, setSubgroupMembers] = useState<SubgroupMember[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [subgroupModalOpen, setSubgroupModalOpen] = useState(false)
  const [newSubgroupName, setNewSubgroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [creatingSubgroup, setCreatingSubgroup] = useState(false)
  const [editingSubgroup, setEditingSubgroup] = useState<Subgroup | null>(null)
  const [deleteSubgroupModalOpen, setDeleteSubgroupModalOpen] = useState(false)
  const [subgroupToDelete, setSubgroupToDelete] = useState<string | null>(null)
  const [deletingSubgroup, setDeletingSubgroup] = useState(false)

  useEffect(() => {
    loadData()
  }, [occasionId])

  const loadData = async () => {
    await Promise.all([
      loadPeople(),
      loadSubgroups(),
      loadSubgroupMembers()
    ])
  }

  const loadPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('occasion_id', occasionId)

      if (error) throw error
      setPeople(data || [])
    } catch (error) {
      console.error('Error loading people:', error)
    }
  }

  const loadSubgroups = async () => {
    try {
      const { data, error } = await supabase
        .from('subgroups')
        .select('*')
        .eq('occasion_id', occasionId)

      if (error) throw error
      setSubgroups(data || [])
    } catch (error) {
      console.error('Error loading subgroups:', error)
    }
  }

  const loadSubgroupMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('subgroup_members')
        .select('*')

      if (error) throw error
      setSubgroupMembers(data || [])
    } catch (error) {
      console.error('Error loading subgroup members:', error)
    }
  }

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return

    setAdding(true)
    try {
      const { error } = await supabase
        .from('people')
        .insert([{ name: newPersonName.trim(), occasion_id: occasionId }])

      if (error) throw error

      setNewPersonName('')
      loadPeople()
      onUpdate()
    } catch (error) {
      console.error('Error adding person:', error)
    } finally {
      setAdding(false)
    }
  }

  const handleRemovePerson = async () => {
    if (!personToDelete) return
    
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', personToDelete)

      if (error) throw error

      setDeleteModalOpen(false)
      setPersonToDelete(null)
      loadPeople()
      onUpdate()
    } catch (error) {
      console.error('Error removing person:', error)
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteModal = (personId: string) => {
    setPersonToDelete(personId)
    setDeleteModalOpen(true)
  }

  const getSubgroupForPerson = (personId: string) => {
    const membership = subgroupMembers.find(sm => sm.person_id === personId)
    if (!membership) return null
    return subgroups.find(sg => sg.id === membership.subgroup_id)
  }

  const handleCreateOrUpdateSubgroup = async () => {
    if (!newSubgroupName.trim() || selectedMembers.size === 0) return

    setCreatingSubgroup(true)
    try {
      if (editingSubgroup) {
        const { error: updateError } = await supabase
          .from('subgroups')
          .update({ name: newSubgroupName.trim() })
          .eq('id', editingSubgroup.id)

        if (updateError) throw updateError

        const { error: deleteError } = await supabase
          .from('subgroup_members')
          .delete()
          .eq('subgroup_id', editingSubgroup.id)

        if (deleteError) throw deleteError

        const memberInserts = Array.from(selectedMembers).map(personId => ({
          subgroup_id: editingSubgroup.id,
          person_id: personId
        }))

        const { error: insertError } = await supabase
          .from('subgroup_members')
          .insert(memberInserts)

        if (insertError) throw insertError
      } else {
        const { data: subgroupData, error: subgroupError } = await supabase
          .from('subgroups')
          .insert([{ name: newSubgroupName.trim(), occasion_id: occasionId }])
          .select()
          .single()

        if (subgroupError) throw subgroupError

        const memberInserts = Array.from(selectedMembers).map(personId => ({
          subgroup_id: subgroupData.id,
          person_id: personId
        }))

        const { error: membersError } = await supabase
          .from('subgroup_members')
          .insert(memberInserts)

        if (membersError) throw membersError
      }

      setNewSubgroupName('')
      setSelectedMembers(new Set())
      setSubgroupModalOpen(false)
      setEditingSubgroup(null)
      loadData()
    } catch (error) {
      console.error('Error creating/updating subgroup:', error)
    } finally {
      setCreatingSubgroup(false)
    }
  }

  const handleDeleteSubgroup = async () => {
    if (!subgroupToDelete) return
    
    setDeletingSubgroup(true)
    try {
      const { error } = await supabase
        .from('subgroups')
        .delete()
        .eq('id', subgroupToDelete)

      if (error) throw error

      setDeleteSubgroupModalOpen(false)
      setSubgroupToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error deleting subgroup:', error)
    } finally {
      setDeletingSubgroup(false)
    }
  }

  const openSubgroupModal = (subgroup?: Subgroup) => {
    if (subgroup) {
      setEditingSubgroup(subgroup)
      setNewSubgroupName(subgroup.name)
      const members = subgroupMembers
        .filter(sm => sm.subgroup_id === subgroup.id)
        .map(sm => sm.person_id)
      setSelectedMembers(new Set(members))
    } else {
      setEditingSubgroup(null)
      setNewSubgroupName('')
      setSelectedMembers(new Set())
    }
    setSubgroupModalOpen(true)
  }

  const openDeleteSubgroupModal = (subgroupId: string) => {
    setSubgroupToDelete(subgroupId)
    setDeleteSubgroupModalOpen(true)
  }

  const toggleMember = (personId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(personId)) {
      newSelected.delete(personId)
    } else {
      newSelected.add(personId)
    }
    setSelectedMembers(newSelected)
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingLg">People Management</Text>
        
        <BlockStack gap="200">
          <InlineStack gap="200">
            <div style={{ flex: 1 }}>
              <TextField
                label="Add Person"
                value={newPersonName}
                onChange={setNewPersonName}
                placeholder="Enter person's name"
                autoComplete="off"
              />
            </div>
            <div style={{ paddingTop: '1.5rem' }}>
              <Button onClick={handleAddPerson} loading={adding} disabled={!newPersonName.trim()}>
                Add Person
              </Button>
            </div>
          </InlineStack>
        </BlockStack>

        {people.length > 0 ? (
          <s-section padding="none">
            <s-table>
            <s-table-header-row>
              <s-table-header>Name</s-table-header>
              <s-table-header>Subgroup</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {people.map(person => {
                const subgroup = getSubgroupForPerson(person.id)
                return (
                  <s-table-row key={person.id}>
                    <s-table-cell>{person.name}</s-table-cell>
                    <s-table-cell>
                      {subgroup ? (
                        <Text as="span" tone="subdued">{subgroup.name}</Text>
                      ) : (
                        <Text as="span" tone="subdued">-</Text>
                      )}
                    </s-table-cell>
                    <s-table-cell>
                      <Button onClick={() => openDeleteModal(person.id)} tone="critical" size="slim">
                        Remove
                      </Button>
                    </s-table-cell>
                  </s-table-row>
                )
              })}
            </s-table-body>
            </s-table>
          </s-section>
        ) : (
          <Text as="p" tone="subdued">No people added yet. Add someone to get started!</Text>
        )}

        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">Subgroups</Text>
            <Button onClick={() => openSubgroupModal()} size="slim">Create Subgroup</Button>
          </InlineStack>
          {subgroups.length > 0 ? (
            <s-section padding="none">
              <s-table>
              <s-table-header-row>
                <s-table-header>Name</s-table-header>
                <s-table-header>Members</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {subgroups.map(subgroup => {
                  const members = subgroupMembers
                    .filter(sm => sm.subgroup_id === subgroup.id)
                    .map(sm => people.find(p => p.id === sm.person_id))
                    .filter(Boolean)
                    .map(p => p!.name)
                  
                  return (
                    <s-table-row key={subgroup.id}>
                      <s-table-cell>{subgroup.name}</s-table-cell>
                      <s-table-cell>{members.join(', ')}</s-table-cell>
                      <s-table-cell>
                        <InlineStack gap="100">
                          <Button onClick={() => openSubgroupModal(subgroup)} size="slim">Edit</Button>
                          <Button onClick={() => openDeleteSubgroupModal(subgroup.id)} tone="critical" size="slim">Delete</Button>
                        </InlineStack>
                      </s-table-cell>
                    </s-table-row>
                  )
                })}
              </s-table-body>
              </s-table>
            </s-section>
          ) : (
            <Text as="p" tone="subdued">No subgroups created yet. Create one to group people together!</Text>
          )}
        </BlockStack>
      </BlockStack>
      
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Remove Person"
        primaryAction={{
          content: 'Remove',
          onAction: handleRemovePerson,
          loading: deleting,
          destructive: true
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDeleteModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <Text as="p">Are you sure you want to remove this person? All their expenses and splits will also be deleted. This action cannot be undone.</Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={subgroupModalOpen}
        onClose={() => setSubgroupModalOpen(false)}
        title={editingSubgroup ? 'Edit Subgroup' : 'Create Subgroup'}
        primaryAction={{
          content: editingSubgroup ? 'Update Subgroup' : 'Create Subgroup',
          onAction: handleCreateOrUpdateSubgroup,
          loading: creatingSubgroup,
          disabled: !newSubgroupName.trim() || selectedMembers.size === 0
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setSubgroupModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Subgroup Name"
              value={newSubgroupName}
              onChange={setNewSubgroupName}
              placeholder="e.g., Couples, Singles"
              autoComplete="off"
            />
            
            <BlockStack gap="200">
              <Text as="p" variant="headingMd">Select Members</Text>
              {people.map(person => (
                <Checkbox
                  key={person.id}
                  label={person.name}
                  checked={selectedMembers.has(person.id)}
                  onChange={() => toggleMember(person.id)}
                />
              ))}
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={deleteSubgroupModalOpen}
        onClose={() => setDeleteSubgroupModalOpen(false)}
        title="Delete Subgroup"
        primaryAction={{
          content: 'Delete',
          onAction: handleDeleteSubgroup,
          loading: deletingSubgroup,
          destructive: true
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDeleteSubgroupModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <Text as="p">Are you sure you want to delete this subgroup? This action cannot be undone.</Text>
        </Modal.Section>
      </Modal>
    </Card>
  )
}
