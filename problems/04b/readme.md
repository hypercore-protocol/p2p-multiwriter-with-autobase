# Autobase 2 - Indexing

In the previous exercise, we saw how Autobase can give you a "causal stream" of messages from N input hypercores, and that this causal stream defines a particular kind of deterministic ordering. Most importantly, we saw how th ecausal stream treats forks, and how the stream ordering grows stable over time as input nodes become "locked" at specific positions.

But why does Autobase produce a causal stream with these properties? So we can dump the stream into a Hypercore and share it! Before Hypercore 10, it wouldn't have been possible to store any kind of causal stream in a Hypercore, because append-only logs can't be reordered. With Hypercore 10's new `truncate` method, we can shorten a Hypercore to a particular length, and then re-append new blocks. 

For the following bits, we'll build off of the chat system from the previous exercise.

## Setup

As with the previous exercises, first create a module with `type: module` and an `index.js` and make sure to install the following dependencies:
```
npm i corestore@next autobase random-access-memory chalk
```

If you like, you can just copy the code you wrote for the previous exercise.


## The Simplest Possible Index

## A Mapping Indexer

## Short-Circuiting with Remote Indexes

## Sparsely Downloading Indexes
