import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://xsecjeumtwnfkztrehxx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZWNqZXVtdHduZmt6dHJlaHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzY2NjcsImV4cCI6MjA4NjExMjY2N30.92lYa2iFeGrrG0MWQjO_dJEzWyVt_iELpOv2lH8LzjE'

const supabase = createClient(supabaseUrl, supabaseKey)

const oldData = JSON.parse(fs.readFileSync('../expenses.json', 'utf-8'))

async function migrate() {
  console.log('Starting migration...')

  for (const [collectionName, collectionData] of Object.entries(oldData.groups)) {
    console.log(`\nMigrating collection: ${collectionName}`)

    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .insert([{ name: collectionName }])
      .select()
      .single()

    if (collectionError) {
      console.error('Error creating collection:', collectionError)
      continue
    }

    console.log(`Created collection with ID: ${collection.id}`)

    const peopleMap = {}
    for (const personName of collectionData.people) {
      const { data: person, error: personError } = await supabase
        .from('people')
        .insert([{ name: personName, collection_id: collection.id }])
        .select()
        .single()

      if (personError) {
        console.error(`Error creating person ${personName}:`, personError)
        continue
      }

      peopleMap[personName] = person.id
      console.log(`  Added person: ${personName}`)
    }

    const subgroupMap = {}
    if (collectionData.subgroups) {
      for (const subgroup of collectionData.subgroups) {
        const { data: sg, error: sgError } = await supabase
          .from('subgroups')
          .insert([{ name: subgroup.name, collection_id: collection.id }])
          .select()
          .single()

        if (sgError) {
          console.error(`Error creating subgroup ${subgroup.name}:`, sgError)
          continue
        }

        subgroupMap[subgroup.name] = sg.id
        console.log(`  Added subgroup: ${subgroup.name}`)

        for (const memberName of subgroup.members) {
          const personId = peopleMap[memberName]
          if (personId) {
            await supabase
              .from('subgroup_members')
              .insert([{ subgroup_id: sg.id, person_id: personId }])
          }
        }
      }
    }

    for (const expense of collectionData.expenses) {
      let payerPersonId = peopleMap[expense.payer]
      let payerSubgroupId = subgroupMap[expense.payer]

      const { data: exp, error: expError } = await supabase
        .from('expenses')
        .insert([{
          collection_id: collection.id,
          payer_person_id: payerPersonId || null,
          payer_subgroup_id: payerSubgroupId || null,
          amount: expense.amount,
          description: expense.description,
          category: expense.category,
          note: expense.note || null,
          date: expense.date
        }])
        .select()
        .single()

      if (expError) {
        console.error(`Error creating expense:`, expError)
        continue
      }

      for (const [personName, splitAmount] of Object.entries(expense.splits)) {
        const personId = peopleMap[personName]
        if (personId) {
          await supabase
            .from('expense_splits')
            .insert([{
              expense_id: exp.id,
              person_id: personId,
              amount: splitAmount
            }])
        }
      }

      console.log(`  Added expense: ${expense.description}`)
    }

    if (collectionData.settlements) {
      for (const settlement of collectionData.settlements) {
        let fromPersonId = peopleMap[settlement.from]
        let fromSubgroupId = subgroupMap[settlement.from]
        let toPersonId = peopleMap[settlement.to]
        let toSubgroupId = subgroupMap[settlement.to]

        await supabase
          .from('settlements')
          .insert([{
            collection_id: collection.id,
            from_person_id: fromPersonId || null,
            from_subgroup_id: fromSubgroupId || null,
            to_person_id: toPersonId || null,
            to_subgroup_id: toSubgroupId || null,
            amount: settlement.amount,
            date: settlement.date
          }])

        console.log(`  Added settlement: ${settlement.from} → ${settlement.to}`)
      }
    }
  }

  console.log('\nMigration complete!')
}

migrate().catch(console.error)
