import chalk from 'chalk'
import ram from 'random-access-memory'
import Corestore from 'corestore'
import Autobase from 'autobase'

// (1) Ordering Chat Messages
console.log(chalk.green('\n(1) Ordering Chat Messages\n'))
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

  for await (const node of baseA.createCausalStream()) {
    console.log(node.value.toString())
  }
}

// (2) Forks and Reordering
console.log(chalk.green('\n(2) Forks and Reordering\n'))
{
  // Create two chat users, each with their own Hypercores.
  const store = new Corestore(ram)
  const userA = store.get({ name: 'userA' })
  const userB = store.get({ name: 'userB' })

  // Make two Autobases with those two users as inputs.
  const baseA = new Autobase([userA, userB], { input: userA })
  const baseB = new Autobase([userA, userB], { input: userB })

  // Append chat messages and read them out again, manually specifying empty clocks.
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
}

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

/*
await baseA.append('A0', []) // [] is an empty vector clock (no causal dependencies)
await baseA.append('A1', []) // (empty vector clocks only useful for tests/demos)
await baseB.append('B0', [])

// Extending A keeps the same fork ordering.

await baseA.append('A2', [])
await baseA.append('A3', [])

// If B becomes longer than A, it will be shifted to the back.

await baseB.append('B1', [])
await baseB.append('B2', [])
await baseB.append('B3', [])
await baseB.append('B4', [])

// Appending with the default (latest) clock will now "lock" the forks in time.
// After this point, the previous forks will never reorg.

await baseB.append('*B5*') // The vector clock argument defaults to the latest clock

// If A's fork is extended, its subsequents writes will appear after B5.

await baseA.append('A4', []) // A stays on its fork

// If B creates a new fork, it will also appear after B5.
// A's new fork and B's new fork will reorder as in the previous examples, but everything before B5 is "locked".

await baseB.append('B6', []) // B creates a new fork
await baseB.append('B7', [])

// Since an Autobase is stateless, it's super easy to remove "misbehaving" writers:
prettyPrint('Here\'s a causal stream that only contains A\'s writes:', 'green')
const withoutB = new Autobase([writerA])
await prettyPrintCausalStream(withoutB)
*/

async function prettyPrintCausalStream (base) {
  process.stdout.write('(latest) -> ')
  for await (const { value } of base.createCausalStream()) {
    process.stdout.write(`${value.toString()} -> `)
  }
  process.stdout.write('(earliest)')
  process.stdout.write('\n')
}






