import chalk from 'chalk'
import ram from 'random-access-memory'
import Corestore from 'corestore'
import Autobase from 'autobase'

// (1) The Simplest Possible Index
console.log(chalk.green('\n(1) The Simplest Possible Index\n'))
{
  // Create two chat users, each with their own Hypercores.
  const store = new Corestore(ram)
  const userA = store.get({ name: 'userA' })
  const userB = store.get({ name: 'userB' })

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase([userA, userB], { input: userA })
  const baseB = new Autobase([userA, userB], { input: userB })

  // Append chat messages and read them out again, using the default options.
  // This simulates two peers who are always completely up-to-date with each others messages.
  await baseA.append('A0: hello!')
  await baseB.append('B0: hi! good to hear from you')
  await baseA.append('A1: likewise. fun exercise huh?')
  await baseB.append('B1: yep. great time.')

  const indexCore = store.get({ name: 'index-core' })
  const index = baseA.createRebasedIndex(indexCore)
  await index.update()

  // The block at index 0 is a header block, so we skip over that.
  for (let i = 1; i < index.length; i++) {
    const node = await index.get(i)
    console.log(node.value.toString())
  }

  // B writes another message
  await baseB.append('B2: ok nice chatting')

  // The index needs to be updated again in order to pull in the new changes.
  await index.update()

  console.log('\nStatus after the second update:', index.status)
}

// (2) The Simplest Index, but with Forks
console.log(chalk.green('\n(2) The Simplest Index, but with Forks\n'))
{
  // Create two chat users, each with their own Hypercores.
  const store = new Corestore(ram)
  const userA = store.get({ name: 'userA' })
  const userB = store.get({ name: 'userB' })
  const indexCore = store.get({ name: 'index-core' })

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase([userA, userB], { input: userA })
  const baseB = new Autobase([userA, userB], { input: userB })

  // We can use either Autobase to create the index, so well just pick baseA
  const index = baseA.createRebasedIndex(indexCore)

  // Append chat messages and read them out again, manually specifying empty clocks.
  // This simulates two peers creating independent forks.
  await baseA.append('A0: hello! anybody home?', []) // An empty array as a second argument means "empty clock"
  await baseB.append('B0: hello! first one here.', [])
  await baseA.append('A1: hmmm. guess not.', [])
  await baseB.append('B1: anybody home?', [])

  await index.update()
  console.log(chalk.blue('Index status after the first two independent messages:'), index.status)

  // Add 3 more independent messages to A.
  for (let i = 0; i < 3; i++) {
    await baseA.append(`A${2 + i}: trying again...`, [])
  }

  await index.update()
  console.log(chalk.blue('Index status after A appends 3 more messages:'), index.status)

  // Add 5 more independent messages to B. Does its fork move to the beginning or the end?
  for (let i = 0; i < 5; i++) {
    await baseB.append(`B${2 + i}: also trying again...`, [])
  }

  await index.update()
  console.log(chalk.blue('Index status after B appends 5 more messages:'), index.status)
}

// (3) A Mapping Indexer
console.log(chalk.green('\n(3) A Mapping Indexer\n'))
{
  // Create two chat users, each with their own Hypercores.
  const store = new Corestore(ram)
  const userA = store.get({ name: 'userA' })
  const userB = store.get({ name: 'userB' })

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase([userA, userB], { input: userA })
  const baseB = new Autobase([userA, userB], { input: userB })

  // Append chat messages and read them out again, using the default options.
  // This simulates two peers who are always completely up-to-date with each others messages.
  await baseA.append('A0: hello!')
  await baseB.append('B0: hi! good to hear from you')
  await baseA.append('A1: likewise. fun exercise huh?')
  await baseB.append('B1: yep. great time.')

  const indexCore = store.get({ name: 'index-core' })
  const index = baseA.createRebasedIndex(indexCore, {
    async apply (batch) {
      batch = batch.map(({ value }) => Buffer.from(value.toString().toUpperCase()))
      await index.append(batch)
    }
  })
  await index.update()

  // All the indexed nodes will be uppercased now.
  for (let i = 1; i < index.length; i++) {
    const node = await index.get(i)
    console.log(node.value.toString())
  }

  // Make another index that is stateful, and records the total message count alongside the message text.
  const secondIndexCore = store.get({ name: 'second-index-core' })
  const secondIndex = baseA.createRebasedIndex(secondIndexCore, {
    async apply (batch) {
      let count = 0

      // First, we need to get the latest count from the last node in the index.
      if (secondIndex.length > 1) { 
        const lastNode = await secondIndex.get(secondIndex.length - 1)
        const lastRecord = JSON.parse(lastNode.value.toString())
        count = lastRecord.count
      }

      // Next, we can record a stringified record that includes both the message and the count for every node in the batch.
      batch = batch.map(({ value }, idx) => {
        const record = JSON.stringify({
          message: value.toString(),
          count: count + idx + 1
        })
        return Buffer.from(record)
      })

      // Finally, append it just like before.
      await secondIndex.append(batch)
    }
  })


  // Pull all the changes into the new, stateful index.
  await secondIndex.update()

  console.log(chalk.blue('\nStateful indexing results:\n'))
  for (let i = 1; i < secondIndex.length; i++) {
    const node = await secondIndex.get(i)
    console.log(JSON.parse(node.value.toString()))
  }
}

/*
// (2) Locking Forks in Time
console.log(chalk.green('\n(2) Locking Forks in Time\n'))
{
  // Create two chat users, each with their own Hypercores.
  const store = new Corestore(ram)
  const userA = store.get({ name: 'userA' })
  const userB = store.get({ name: 'userB' })

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase([userA, userB], { input: userA })
  const baseB = new Autobase([userA, userB], { input: userB })

  // (2) Append chat messages and read them out again, manually specifying empty clocks.
  // This simulates two peers creating independent forks.
  await baseA.append('A0: hello! anybody home?', []) // An empty array as a second argument means "empty clock"
  await baseB.append('B0: hello! first one here.', [])
  await baseA.append('A1: hmmm. guess not.', [])
  await baseB.append('B1: anybody home?', [])


  console.log(chalk.blue('After A and B each wrote two independent messages:'))
  for await (const node of baseA.createCausalStream()) {
    console.log(node.value.toString())
  }

  // Add 3 more independent messages to A. Does its fork move to the beginning or the end?
  for (let i = 0; i < 3; i++) {
    await baseA.append(`A${2 + i}: trying again...`, [])
  }

  console.log(chalk.blue('After A wrote 3 more independent messages:'))
  for await (const node of baseA.createCausalStream()) {
    console.log(node.value.toString())
  }

  // Add 5 more independent messages to B. Does its fork move to the beginning or the end?
  for (let i = 0; i < 5; i++) {
    await baseB.append(`B${2 + i}: also trying again...`, [])
  }

  console.log(chalk.blue('After B wrote 5 more independent messages:'))
  for await (const node of baseA.createCausalStream()) {
    console.log(node.value.toString())
  }

  // Resolve the two forks by having B record a message that causally links both forks.
  await baseB.append('B7: looks like we\'re both online!')

  console.log(chalk.blue('After B resolved the forks:'))
  for await (const node of baseA.createCausalStream()) {
    console.log(node.value.toString())
  }

  // Making A and B fork once more
  await baseA.append('A5: oops. gone again', [])
  await baseB.append('B8: hello?', [])

  console.log(chalk.blue('After A and B forked again:'))
  for await (const node of baseA.createCausalStream()) {
    console.log(node.value.toString())
  }
}
*/





