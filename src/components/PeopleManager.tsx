import { useState, useEffect } from 'react'
import { Card, TextField, Button, List, InlineStack, BlockStack, Modal, Text } from '@shopify/polaris'
import { supabase, Person, Subgroup, SubgroupMember } from '../lib/supabase'

interface Props {
  collectionId: string
  onUpdate: () => void
}

export default function PeopleManager({ collectionId, onUpdate }: Props) {
  const [people, setPeople] = useState<Person[]>([])
  const [subgroups, setSubgroups] = useState<Subgroup[]>([])
  const [subgroupMembers, setSubgroupMembers] = useState<SubgroupMember[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [collectionId])

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
        .eq('collection_id', collectionId)

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
        .eq('collection_id', collectionId)

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
        .insert([{ name: newPersonName.trim(), collection_id: collectionId }])

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

  const handleRemovePerson = async (personId: string) => {
    try {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', personId)

      if (error) throw error

      loadPeople()
      onUpdate()
    } catch (error) {
      console.error('Error removing person:', error)
    }
  }

  const getSubgroupForPerson = (personId: string) => {
    const membership = subgroupMembers.find(sm => sm.person_id === personId)
    if (!membership) return null
    return subgroups.find(sg => sg.id === membership.subgroup_id)
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
          <List type="bullet">
            {people.map(person => {
              const subgroup = getSubgroupForPerson(person.id)
              return (
                <List.Item key={person.id}>
                  <InlineStack gap="200" align="space-between" blockAlign="center">
                    <Text as="span">
                      {person.name}
                      {subgroup && <Text as="span" tone="subdued"> (part of {subgroup.name})</Text>}
                    </Text>
                    <Button onClick={() => handleRemovePerson(person.id)} tone="critical" size="slim">
                      Remove
                    </Button>
                  </InlineStack>
                </List.Item>
              )
            })}
          </List>
        ) : (
          <Text as="p" tone="subdued">No people added yet. Add someone to get started!</Text>
        )}

        {subgroups.length > 0 && (
          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">Subgroups</Text>
            <List type="bullet">
              {subgroups.map(subgroup => {
                const members = subgroupMembers
                  .filter(sm => sm.subgroup_id === subgroup.id)
                  .map(sm => people.find(p => p.id === sm.person_id))
                  .filter(Boolean)
                  .map(p => p!.name)
                
                return (
                  <List.Item key={subgroup.id}>
                    <Text as="span">
                      {subgroup.name}: {members.join(', ')}
                    </Text>
                  </List.Item>
                )
              })}
            </List>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  )
}
