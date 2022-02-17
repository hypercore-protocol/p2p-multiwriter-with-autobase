# Autobase 1 - Causal Streams

Now that you've had a crash course in creating and replicate Hypercores between peers using Hyperswarm, let's dive into our newest feature: multiwriter collaboration with Autobase.

Autobase is a new module we've introduced alongside Hypercore v10 that allows you to "rebase together" many Hypercores, perhaps from many different people on different machines, into a single, linearized Hypercore (called a "linearized view", which we'll get to later). Importantly, Autobase ensures that anybody can recreate that linearized Hypercore locally -- the ordering is uniquely defined by the set of input Hypercores passed to Autobase -- and we'll get to why that's important in the next exercise.

For now, let's go through what ordering means in the context of Autobase by building a simple chat system.

## Setup

As with the previous exercises, first create a module with `type: module` and an `index.js` and make sure to install the following dependencies:
```
npm i corestore@next autobase random-access-memory chalk
```

## Creating Autobases

Say you have two users, each with their own Hypercores, who want to chat with each other by appending messages to their cores. To get set up, we'll create two Hypercores, and then create one Autobase for each user:
```js
import Hypercore from 'hypercore'
import Autobase from 'autobase'
import ram from 'random-access-memory'

// Create two chat users, each with their own Hypercores.
// Here since we'll be rerunning the same code a lot, we'll use the ram storage

const store = new Corestore(ram)
const userA = store.get({ name: 'userA' })
const userB = store.get({ name: 'userB' })

// Make an Autobase with those two users as inputs.

const baseA = new Autobase({ inputs: [userA, userB], localInput: userA })
const baseB = new Autobase({ inputs: [userA, userB], localInput: userB })
```

The Autobase constructor above says "Create an Autobase using `userA` and `userB` as inputs, where my local input is `userA`". The local input will be what's appended to by default in the `append` operations below.

## Ordering Chat Messages

Somehow, each message needs to indicate its context: the messages that the sender had previously seen when they wrote that message, we call this "causal information". Autobase handles this for you automatically.

Let's have each user write a few chat messages and then read out the complete chat log. We can do this with the `append` and `createCausalStream` methods as follows:
```js
await baseA.append('A0: hello!')
await baseB.append('B0: hi! good to hear from you')
await baseA.append('A1: likewise. fun exercise huh?')
await baseB.append('B1: yep. great time.')

// Let's print all messages in causal order
for await (const node of baseA.createCausalStream()) {
  console.log(node.value.toString())
}
```

You should hopefully see that the messages appear in the "correct" order, but reversed. They're reversed because Autobase's causal stream walks backwards, starting at the "head" of each input Hypercore, and yielding messages in causal order. Causal order here means that the N+1th message returned by the causal stream will *never* be causally-dependent on the Nth message.

Note how the causal stream returns "input nodes" which contain the chat message (in the `value` field) along with additional metadata that's used for ordering. Take a look at the `clock` field, for example. When you do an `append` with default options, Autobase will embed the "latest clock" in the message, meaning that because our Hypercores are local in this example, we're simulating two peers who are connected and completely up-to-date with each other.

But in the real world, peers come and go, and connectivity can be spotty. Let's make the example more interesting by modifying the causal information that's recorded by `append`.

### Exercises
1. Try printing the `clock` on the causal stream nodes instead of the `value` to get a sense for how Autobase orders messages.
2. Print the output of `baseB.createCausalStream()`. Is there any difference?

## Forks and Reordering

First, let's start over and re-create `baseA` and `baseB`, so we can start from a fresh state.

What if the second user writes a new message before observing the first user's latest message? Now we're in a "forked state", where the latest messages for each user are causally independent.

We can simulate this by forcing `append` to record an empty clock in the input node, which means "this message is not causally-dependent on any other message":
```js
await baseA.append('A0: hello! anybody home?', []) // An empty array as a second argument means "empty clock"
await baseB.append('B0: hello! first one here.', [])
await baseA.append('A1: hmmm. guess not.', [])
await baseB.append('B1: anybody home?', [])

for await (const node of baseA.createCausalStream()) {
  console.log(node.value.toString())
}
```

Since we have two independent forks, you should see either A's fork or B's fork yielded first, then the other yielded second. Which one comes first? The causal stream will *always* yield shorter forks before longer ones. We'll show why this is important in the next section (indexing), but in this case both forks have the same length (2). When forks have the same length, the "winner" is decided deterministically by comparing Hypercore keys -- everyone will always see the same ordering.

### Exercises
1. Try appending 3 more messages on `baseA`, all with empty clocks (growing the fork). How does that change the ordering?
2. Now append 5 more messages to `baseB`, also with empty clocks. What now?

## Locking Forks in Time

Let's say A and B have been on independent forks for a while now, then they finally reconnect and A writes a new chat message that causally links to both forks. Immediately after that, they disconnect again and start forking once more. What happens to the ordering?

To simulate this, only one additional `append` is necessary. Extend the previous example with the following `append` containing the latest clock:
```js
// note that this append links the clocks of the previous ones
await baseB.append('B7: looks like we\'re both online!')
```

At this point, the causal stream ordering is completely "locked". Anybody who observes B7, and subsequently creates a causal stream, will see the exact same ordering for all messages before B7.

To show what we mean, let's make A and B fork one more time:
```js
await baseA.append('A5: oops. gone again', [])
await baseB.append('B8: hello?', [])
```

The two new forks are at the "tip" of the causal stream, and everything behind B7 remains the same. This property will be extremely useful in the next section, where we show how causal streams can be used to generate indexes over Autobase inputs.

## Next Up: Linearized Views

Now that you've seen how Autobase can generate a deterministic ordering over messages in many input Hypercores, we'll walk through how to make use of that ordering to generate shareable, Hypercore-based views over those inputs.

Continue to [Problem 4b](../04b) when ready.
