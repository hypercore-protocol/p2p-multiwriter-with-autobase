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
  const view = baseA.linearize(indexCore)
  await view.update()

  for (let i = 0; i < view.length; i++) {
    const node = await view.get(i)
    console.log(node.value.toString())
  }

  // B writes another message
  await baseB.append('B2: ok nice chatting')

  // The index needs to be updated again in order to pull in the new changes.
  await view.update()

  console.log('\nStatus after the second update:', view.status)
}

// (2) The Simplest Index, but with Forks
console.log(chalk.green('\n(2) The Simplest Index, but with Forks\n'))
{
  // Create two chat users, each with their own Hypercores.
  const store = new Corestore(ram)
  const userA = store.get({ name: 'userA' })
  const userB = store.get({ name: 'userB' })
  const viewCore = store.get({ name: 'view-core' })

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase([userA, userB], { input: userA })
  const baseB = new Autobase([userA, userB], { input: userB })

  // We can use either Autobase to create the index, so well just pick baseA
  const view = baseA.linearize(viewCore)

  // Append chat messages and read them out again, manually specifying empty clocks.
  // This simulates two peers creating independent forks.
  await baseA.append('A0: hello! anybody home?', []) // An empty array as a second argument means "empty clock"
  await baseB.append('B0: hello! first one here.', [])
  await baseA.append('A1: hmmm. guess not.', [])
  await baseB.append('B1: anybody home?', [])

  await view.update()
  console.log(chalk.blue('Index status after the first two independent messages:'), view.status)

  // Add 3 more independent messages to A.
  for (let i = 0; i < 3; i++) {
    await baseA.append(`A${2 + i}: trying again...`, [])
  }

  await view.update()
  console.log(chalk.blue('Index status after A appends 3 more messages:'), view.status)

  // Add 5 more independent messages to B. Does its fork move to the beginning or the end?
  for (let i = 0; i < 5; i++) {
    await baseB.append(`B${2 + i}: also trying again...`, [])
  }

  await view.update()
  console.log(chalk.blue('Index status after B appends 5 more messages:'), view.status)
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

  const viewCore = store.get({ name: 'view-core' })
  const view = baseA.linearize(viewCore, {
    async apply (batch) {
      batch = batch.map(({ value }) => Buffer.from(value.toString().toUpperCase()))
      await view.append(batch)
    }
  })
  await view.update()

  // All the indexed nodes will be uppercased now.
  for (let i = 1; i < view.length; i++) {
    const node = await view.get(i)
    console.log(node.value.toString())
  }

  // Make another index that is stateful, and records the total message count alongside the message text.
  const secondViewCore = store.get({ name: 'second-view-core' })
  const secondView = baseA.linearize(secondViewCore, {
    async apply (batch) {
      let count = 0

      // First, we need to get the latest count from the last node in the view.
      if (secondView.length > 0) { 
        const lastNode = await secondView.get(secondView.length - 1)
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
      await secondView.append(batch)
    }
  })


  // Pull all the changes into the new, stateful index.
  await secondView.update()

  console.log(chalk.blue('\nStateful indexing results:\n'))
  for (let i = 0; i < secondView.length; i++) {
    const node = await secondView.get(i)
    console.log(JSON.parse(node.value.toString()))
  }
}

// (4) Sharing Indexes with Others
console.log(chalk.green('\n(1) Sharing Indexes with Others\n'))
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

  const viewCore = store.get({ name: 'view-core' })
  const view = baseA.linearize(viewCore)
  await view.update()

  // Now we will simulate a "reader" who will use the index above as a remote index.
  // The reader will not be participating in the chat, but will be reading from the index.
  const baseC = new Autobase([userA, userB]) 
  const readerView = baseC.linearize([viewCore], {
    autocommit: false // Ignore this for now
  })

  // This will piggy-back off of the work `viewCore` has already done.
  await readerView.update()

  // Since the remote index is fully up-to-date, the reader should not have to do any work.
  console.log(chalk.blue('Reader update status (should be zeros):'), readerView.status, '\n')

  // The block at index 0 is a header block, so we skip over that.
  for (let i = 0; i < readerView.length; i++) {
    const node = await readerView.get(i)
    console.log(node.value.toString())
  }
}
