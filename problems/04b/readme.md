# Autobase 2 - Indexing / View

In the previous exercise, we saw how Autobase can give you a "causal stream" of messages from N input hypercores, and that this causal stream defines a particular kind of deterministic ordering. Most importantly, we saw how the causal stream treats forks, and how the stream ordering grows stable over time as input nodes become "locked" at specific positions.

But why does Autobase produce a causal stream with these properties? So we can persist the stream into a Hypercore and share it! Before Hypercore 10, it wouldn't have been possible to store any kind of causal stream in a Hypercore, because append-only logs can't be reordered. With Hypercore 10's new `truncate` method, we can shorten a Hypercore to a particular length, and then re-append new blocks. Truncation is still expensive, though, so we want to minimize both how often we truncate, and how large those truncations are -- hence the causal stream's very particular approach to ordering.

Let's demonstrate what it looks like to persist an Autobase's causal stream into a Hypercore, then go into some of the cool applications this enables.

For the following bits, we'll build off of the chat system from the previous exercise.

## Setup

As with the previous exercises, first create a module with `type: module` and an `index.js` and make sure to install the following dependencies:
```
npm i corestore@next autobase random-access-memory chalk
```

If you like, you can just copy over the code you wrote for the previous exercise.

## (1) The Simplest Possible View

For the first example, we'll start with the very first example from the previous exercise: two fully-connected peers exchanging chat messages. No forks. 

To persist the conversation into a Hypercore, we can use `const view = base.linearize(...)`. This will return a "view", which looks and feels just like a Hypercore.

Views have an `update` function that can be used to tell the view to process any changes to the inputs that have happened since the last update.

Try adding this chunk of code to the end of section (1) from the previous exercise:
```js
const viewCore = store.get({ name: 'view-core' })
const view = baseA.linearize(viewCore)
await view.update()

// The block at index 0 is a header block, so we skip over that.
for (let i = 0; i < view.length; i++) {
  const node = await view.get(i)
  console.log(node.value.toString())
}
```

### Exercises
1. Have `baseB` append another message. What happens to `view` after this? Try seeing what `view.status` says -- it gives stats about what happened to the view during the most recent update.

## (2) The Simplest View, but with Forks

Now we'll see how a reordering of the causal stream affects indexing. Let's revisit the second example from the previous exercise (the one where we create two independent forks).

Copy the code from that section, but create a linearized index using the approach above. Every time either `baseA` or `baseB` appends new messages, update the index with `await index.update()` and then see how `index.status` changes. 

You'll notice that whenever there's a reordering, the `removed` field is > 0 -- this means that the view Hypercore has been truncated.

You'll also notice that after A grows by 3, `removed` is 4 and `added` is 7. This is because A and B get reordered (causing the entire view to be truncated), and then A's 3 new messages are added on top.

### Exercises
1. Just try out the example and watch how `view.status` changes in response to causal stream reorderings.

## (3) A Mapping 

Even the simple view we made is useful for certain cases -- with chat, for example, often you just want to display a chat log without having to recompute the ordering unnecessarily.

But `linearize` really shines when it's paired with an `apply` function, which lets you configure exactly what should be recorded in the index in response to a batch of input nodes.

As an example, let's say we want to apply a map function to the chat messages to convert all the messages to uppercase. We'd do this by adding the following `apply` option to `linearize`:
```js
const view = base.linearize(indexCore, {
  async apply (batch) {
    batch = batch.map(({ value }) => Buffer.from(value.toString().toUpperCase()))
    await view.append(batch)
  }
})
```

Note that you can modify the `view` directly with `append`, which is just like a normal Hypercore `append`, but you can only do this inside of the `apply` function!

The second exercise for this section involves making a stateful indexer -- an `apply` function that records cumulative information about all the input nodes that have been processed so far. It's definitely trickier, but really highlights the value of these derived views. If you were to share this view with others, they could check the message count by downloading a single block, the latest one!

We extend this concept a lot further in the next exercise -- the rabbit hole goes deeper.

### Exercises
1. Add that `apply` function to `linearize` and see how the index Hypercore changes as a result.
2. __HARD__: Make the map function stateful, such that it includes the total number of messages sent by either A or B in the blocks it records. You can call `index.get` from inside the `apply` function.
  * For this exercise, feel free to jump straight to the solution if you get stuck.

## (4) Sharing Indexes with Others

In the previous sections we've seen how remote indexes can be used in combination with the apply function to make powerful data structures that are indexed on the fly. However for readers accessing our data structures it's a bad user experience to have to reindex all of the inputs - especially as the Autobase's input Hypercores grow longer and longer over time. We'd prefer a near instant experience like we are used to from most centralised systems, without needing to wait for a long pre-indexing step. Luckily, Autobase's remote indexes solve this for us.

By passing Hypercores representing other peers' indexes to `linearize`, Autobase will piggy-back on those "remote indexes", and only apply the minimal changes needed instead of re-indexing every input from start to finish. Using these remote indexes massively improves the reader-side experience. Say the participants in our chat want to share the chat log with millions of readers -- with remote indexes, those readers will have very little (if any) indexing work to do locally, and they can make use of Hypercore's other cool features, like bandwidth sharing and sparse syncing.

### Exercises
Let's extend the very first example in this section with a second index that treats the first index as a remote one.

`linearize` behaves differently depending on whether the Hypercores it's given are readable (meaning coming from remote peers) or writable (local Hypercores). If you give it an Array of readable Hypercores, those will be treated as remote views. If the Hypercores are writable, they will be treated as local views, and the complete causal stream will be rebased into them.

Copy over your code for (1), and add another index as follows:
```js
const baseC = new Autobase([userA, userB]) 
const readerView = baseC.linearize([viewCore], {
  autocommit: false // Ignore this for now
})

// This will piggy-back off of the work `viewCore` has already done.
await readerView.update()
```

The `autocommit` flag is only necessary because we are simulating a remote peer locally, so `viewCore` is writable. We explicitly tell the index to treat `viewCore` as a remote index with that flag.

Notice how the `status` shows that the update didn't add or remove any new nodes. This means that the reader has detected that `viewCore` is completely up-to-date, and so no additional indexing is necessary.

## (5) Sparsely Downloading Views

Views are just Hypercores, and so they share all of Hypercore's nice properties. One particular cool feature is the ability to "sparsely download" blocks on-demand. In the next exercise, we're going to use the indexing approach above to build a Hyperbee, our Hypercore-based [B-Tree](https://en.wikipedia.org/wiki/B-tree) implemention -- with Hyperbee, you can store KV-pairs, and then perform range queries over keys, while only touching a subset of the blocks in the underlying Hypercore.

Imagine you have an Autobase with many inputs, and there's an indexer that's been doing the heavy lifting, digesting the inputs into a Hyperbee. If a reader adds that view as a remote view, then they can immediately start querying the Hyperbee, only downloading blocks as needed, without needing to do any additional work!

The ability to share and sparsely sync views makes Autobase a lot more useful, because it allows readers to sidestep as much indexing/downloading as possible, so long as there are existing views available on the network.

## Up Next: A Complete Example

Now all the pieces are in place to build a useful application on top of Autobase and Hyperswarm.

Continue on to [Problem 5](../05) to start building your CLI-based Reddit clone!
