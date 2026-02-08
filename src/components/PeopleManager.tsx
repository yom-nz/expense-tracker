import { useState, useEffect } from 'react'
import { Card, TextField, Button, InlineStack, BlockStack, Text, Modal, Checkbox, Badge } from '@shopify/polaris'
import { supabase, type Person, type Subgroup, type SubgroupMember } from '../lib/supabase'
import PersonDetail from './PersonDetail'
import SubgroupDetail from './SubgroupDetail'

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
  const [addPersonModalOpen, setAddPersonModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null)

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
      setAddPersonModalOpen(false)
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

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (selectedPersonId) {
    return (
      <PersonDetail
        personId={selectedPersonId}
        occasionId={occasionId}
        onBack={() => setSelectedPersonId(null)}
        onUpdate={loadData}
      />
    )
  }

  if (selectedSubgroupId) {
    return (
      <SubgroupDetail
        subgroupId={selectedSubgroupId}
        occasionId={occasionId}
        onBack={() => setSelectedSubgroupId(null)}
        onUpdate={loadData}
      />
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <BlockStack gap="400">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text as="h2" variant="headingLg">People</Text>
          <Button variant="primary" onClick={() => setAddPersonModalOpen(true)}>
            Add Person
          </Button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px'
        }}>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Total People</Text>
              <Text as="h3" variant="headingXl">{people.length}</Text>
            </BlockStack>
          </Card>
        </div>

        <Card>
          <BlockStack gap="400">
            <TextField
              label=""
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search people"
              autoComplete="off"
              clearButton
              onClearButtonClick={() => setSearchQuery('')}
            />

            {filteredPeople.length > 0 ? (
              <s-section padding="none">
                <s-table>
                  <s-table-body>
                    {filteredPeople.map((person) => {
                      const subgroup = getSubgroupForPerson(person.id)
                      return (
                        <s-table-row 
                          key={person.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedPersonId(person.id)}
                        >
                          <s-table-cell>
                            <BlockStack gap="100">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                {person.name}
                              </Text>
                              {subgroup && (
                                <div>
                                  <Badge tone="info">{subgroup.name}</Badge>
                                </div>
                              )}
                            </BlockStack>
                          </s-table-cell>
                          <s-table-cell>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.5 15L12.5 10L7.5 5" stroke="#8C9196" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </s-table-cell>
                        </s-table-row>
                      )
                    })}
                  </s-table-body>
                </s-table>
              </s-section>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <Text as="p" tone="subdued">{searchQuery ? 'No people found' : 'No people added yet. Add someone to get started!'}</Text>
              </div>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingMd">Subgroups</Text>
              <Button onClick={() => openSubgroupModal()} size="slim">Create Subgroup</Button>
            </InlineStack>
            {subgroups.length > 0 ? (
              <s-section padding="none">
                <s-table>
                  <s-table-body>
                    {subgroups.map((subgroup) => {
                      const members = subgroupMembers
                        .filter(sm => sm.subgroup_id === subgroup.id)
                        .map(sm => people.find(p => p.id === sm.person_id))
                        .filter(Boolean)
                        .map(p => p!.name)
                      
                      return (
                        <s-table-row 
                          key={subgroup.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedSubgroupId(subgroup.id)}
                        >
                          <s-table-cell>
                            <BlockStack gap="100">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                {subgroup.name}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {members.length} {members.length === 1 ? 'member' : 'members'} · {members.join(', ')}
                              </Text>
                            </BlockStack>
                          </s-table-cell>
                          <s-table-cell>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.5 15L12.5 10L7.5 5" stroke="#8C9196" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </s-table-cell>
                        </s-table-row>
                      )
                    })}
                  </s-table-body>
                </s-table>
              </s-section>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <Text as="p" tone="subdued">No subgroups created yet. Create one to group people together!</Text>
              </div>
            )}
          </BlockStack>
        </Card>
      </BlockStack>

      <Modal
        open={addPersonModalOpen}
        onClose={() => setAddPersonModalOpen(false)}
        title="Add Person"
        primaryAction={{
          content: 'Add',
          onAction: handleAddPerson,
          loading: adding,
          disabled: !newPersonName.trim()
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setAddPersonModalOpen(false)
          }
        ]}
      >
        <Modal.Section>
          <TextField
            label="Name"
            value={newPersonName}
            onChange={setNewPersonName}
            placeholder="Enter person's name"
            autoComplete="off"
          />
        </Modal.Section>
      </Modal>
      
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
    </div>
  )
}
