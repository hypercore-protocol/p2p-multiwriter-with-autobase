# Autobase 2 - Indexing

In the previous exercise, we saw how Autobase can give you a "causal stream" of messages from N input hypercores, and that this causal stream defines a particular kind of deterministic ordering. Most importantly, we saw how th ecausal stream treats forks, and how the stream ordering grows stable over time as input nodes become "locked" at specific positions.

But why does Autobase produce a causal stream with these properties? So we can persist the stream into a Hypercore and share it! Before Hypercore 10, it wouldn't have been possible to store any kind of causal stream in a Hypercore, because append-only logs can't be reordered. With Hypercore 10's new `truncate` method, we can shorten a Hypercore to a particular length, and then re-append new blocks. Truncation is still expensive, though, so we want to minimize both how often we truncate, and how large those truncations are -- hence the causal stream's very particular approach to ordering.

Let's demonstrate what it looks like to persist an Autobase's causal stream into a Hypercore, then go into some of the cool applications this enables.

For the following bits, we'll build off of the chat system from the previous exercise.

## Setup

As with the previous exercises, first create a module with `type: module` and an `index.js` and make sure to install the following dependencies:
```
npm i corestore@next autobase random-access-memory chalk
```

If you like, you can just copy over the code you wrote for the previous exercise.

## The Simplest Possible Index

For the first example, we'll start with the very first example from the previous exercise: two fully-connected peers exchanging chat messages. No forks. 

Let's persist the conversation into a Hypercore

## A Mapping Indexer

## A Word-Counting Indexer

## Short-Circuiting with Remote Indexes

## Sparsely Downloading Indexes

Rebased indexes are just Hypercores, and so they share all of Hypercore's nice properties. One particular cool feature is the ability to "sparsely download" blocks on-demand. In the next exercise, we're going to use the indexing approach above to build a Hyperbee, our Hypercore-based [B-Tree](https://en.wikipedia.org/wiki/B-tree) implemention -- with Hyperbee, you can store KV-pairs, and then perform range queries over keys, while only touching a subset of the blocks in the underlying Hypercore.

Imagine you have an Autobase with many inputs, and there's an indexer that's been doing the heavy lifting, digesting the inputs into a Hyperbee. If a reader adds that index as a remote index, then they can immediately start querying the Hyperbee, only downloading blocks as needed, without needing to do any additional work!

The ability to share and sparsely sync indexes makes Autobase a lot more useful, because it allows readers to sidestep as much indexing/downloading as possible, so long as there are existing indexes available on the network.

## Up Next: A Complete Example

Now all the pieces are in place to build a useful application on top of Autobase and Hyperswarm.

Continue on to the next example to start building your CLI-based Reddit clone!
