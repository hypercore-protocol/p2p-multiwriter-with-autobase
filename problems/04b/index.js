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
  const viewCore = store.get({ name: 'view-core' })

  await userA.ready();

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase({inputs: [userA, userB], localInput: userA, localOutput: viewCore, eagerUpdate: false })
  const baseB = new Autobase({inputs: [userA, userB],  localInput: userB })

  // Append chat messages and read them out again, using the default options.
  // This simulates two peers who are always completely up-to-date with each others messages.
  await baseA.append('A0: hello!')
  await baseB.append('B0: hi! good to hear from you')
  await baseA.append('A1: likewise. fun exercise huh?')
  await baseB.append('B1: yep. great time.')

  baseA.start()
  const view = baseA.view;
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

  for (let i = 0; i < view.length; i++) {
    const node = await view.get(i)
    console.log(node.value.toString())
  }
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
  const baseA = new Autobase({inputs: [userA, userB], localInput: userA, localOutput: viewCore })
  const baseB = new Autobase({inputs: [userA, userB],  localInput: userB })

  // We can use either Autobase to create the index, so well just pick baseA
  baseA.start()
  const view = baseA.view;

  // Append chat messages and read them out again, manually specifying empty clocks.
  // This simulates two peers creating independent forks.
  await baseA.append('A0: hello! anybody home?', []) // An empty array as a second argument means "empty clock"
  await baseB.append('B0: hello! first one here.', [])
  await baseA.append('A1: hmmm. guess not.', [])
  await baseB.append('B1: anybody home?', [])

  await view.update()
  for (let i = 0; i < view.length; i++) {
    const node = await view.get(i)
    console.log(node.value.toString())
  }
  console.log(chalk.blue('Index status after the first two independent messages:'), view.status)

  // Add 3 more independent messages to A.
  for (let i = 0; i < 3; i++) {
    await baseA.append(`A${2 + i}: trying again...`, [])
  }

  await view.update()
  for (let i = 0; i < view.length; i++) {
    const node = await view.get(i)
    console.log(node.value.toString())
  }
  console.log(chalk.blue('Index status after A appends 3 more messages:'), view.status)

  // Add 5 more independent messages to B. Does its fork move to the beginning or the end?
  for (let i = 0; i < 5; i++) {
    await baseB.append(`B${2 + i}: also trying again...`, [])
  }

  await view.update()
  for (let i = 0; i < view.length; i++) {
    const node = await view.get(i)
    console.log(node.value.toString())
  }
  console.log(chalk.blue('Index status after B appends 5 more messages:'), view.status)
  await baseA.append(`A5: also trying again... but causally`)
  await view.update()
  for (let i = 0; i < view.length; i++) {
    const node = await view.get(i)
    console.log(node.value.toString())
  }
  console.log(chalk.blue('Index status after A appends 1 more message:'), view.status)
}

// (3) A Mapping Indexer
console.log(chalk.green('\n(3) A Mapping Indexer\n'))
{
  // Create two chat users, each with their own Hypercores.
  const store = new Corestore(ram)
  const userA = store.get({ name: 'userA' })
  const userB = store.get({ name: 'userB' })
  const viewCore = store.get({ name: 'view-core' })
  const secondViewCore = store.get({ name: 'second-view-core' })

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase({inputs: [userA, userB], localInput: userA, localOutput: viewCore })
  const baseB = new Autobase({inputs: [userA, userB],  localInput: userB, localOutput: secondViewCore })

  // Append chat messages and read them out again, using the default options.
  // This simulates two peers who are always completely up-to-date with each others messages.
  await baseA.append('A0: hello!')
  await baseB.append('B0: hi! good to hear from you')
  await baseA.append('A1: likewise. fun exercise huh?')
  await baseB.append('B1: yep. great time.')

  baseA.start({
    async apply (batch) {
      const uppercasedBatch = batch.map(({ value }) => Buffer.from(value.toString().toUpperCase()))

      return await baseA.view.append(uppercasedBatch)
    }
  })
  const view = baseA.view;
  await view.update()

  // All the indexed nodes will be uppercased now.
  for (let i = 0; i < view.length; i++) {
    const node = await view.get(i)
    console.log(node.value.toString())
  }

  // Make another index that is stateful, and records the total message count alongside the message text.
  baseB.start({
    async apply (batch) {
      const view = baseB.view;

      let count = 0

      // First, we need to get the latest count from the last node in the view.
      if (view.length > 0) { 
        const lastNode = await view.get(view.length - 1)
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
      await view.append(batch)
    }
  })
  const secondView = baseB.view;

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
  const viewCore = store.get({ name: 'view-core' })

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase({inputs: [userA, userB], localInput: userA, localOutput: viewCore })
  const baseB = new Autobase({inputs: [userA, userB],  localInput: userB })

  // Append chat messages and read them out again, using the default options.
  // This simulates two peers who are always completely up-to-date with each others messages.
  await baseA.append('A0: hello!')
  await baseB.append('B0: hi! good to hear from you')
  await baseA.append('A1: likewise. fun exercise huh?')
  await baseB.append('B1: yep. great time.')

  baseA.start()
  const view = baseA.view;
  await view.update()

  // Now we will simulate a "reader" who will use the index above as a remote index.
  // The reader will not be participating in the chat, but will be reading from the index.
  const baseC = new Autobase({inputs: [userA, userB], outputs: [viewCore]});
  baseC.start({
    eagerUpdate: false, // Ignore this for now
    async apply (batch) {
      return await baseC.view.append(batch)
    }
  })
  const readerView = baseC.view;

  // This will piggy-back off of the work `viewCore` has already done.
  await readerView.update()

  // Since the remote index is fully up-to-date, the reader should not have to do any work.
  console.log(chalk.blue('Reader update status (should be zeros):'), readerView.status, '\n')

  for (let i = 0; i < readerView.length; i++) {
    const node = await readerView.get(i)
    console.log(node.value.toString())
  }
}
