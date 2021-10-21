# What to Swarm? Cores!

While P2P networking is an incredibly powerful concept by itself, it often lacks a companion. A fully authenticated and secure data structure you can share with multiple peers without having to trust any of them to not modify the data before giving it to other peers.

That abstraction is called Hypercore, and we've covered it in many previous workshops. For this workshop in the later exercises we'll be building powerful multi-writer applications on top of it, and we'll be using the next version of Hypercore to power this, called Hypercore 10.

Hypercore 10 is an append-only log, or basically a distributed array, that supports a series of important APIs

* `await core.append(data)` - Insert a new block of data
* `data = await core.get(index)` - Get a specific block of data
* `await core.update()` - Make sure you have the latest version
* `core.length` - How much data is in the core?
* `await core.truncate(newLength)` - Reset the core to a specific length

These APIs can be used to build a ton of powerful data structures on top, including key/value stores, video streaming and much more.

One of the most powerful things that Hypercore provides is the ability to download just the specific parts of the core you need for your application. For example a video stream would only want to download the blocks of data needed to render the video to the user rather than to download a full 4K video first.

Hypercore provides all this, but in a way where peers can relay blocks of data to other peers, without anyone having to trust anything other than the public key of the Hypercore itself. The caveat is that only a single person is allowed to update and modify the Hypercore itself, but with the above primitives we can build simple abstractions that solves that also, which we'll do in the next exercise after this.

Hypercores are most easily managed using something called a Corestore, which is a small abstraction that creates and maintains as many Hypercores as you need.

You can read more about Hypercore 10 in it's readme:

https://github.com/hypercore-protocol/hypercore-next

And more about Corestore in it's readme:

https://github.com/hypercore-protocol/corestore-next

## Exercise 1 - Using Corestore to make Hypercores

First install the latest version of Corestore from NPM. Again it's available under the `next` npm tag. The Hypercores this version of Corestore produce are also all the of the latest version (10). If you want to play around with that directly that's also available under the `next` tag on Hypercore.

```sh
npm install corestore@next
```

Now make a file called `corestore.js` and insert the following

```js
import Corestore from 'corestore'

const store = new Corestore('./store')

// You can access cores from the store either by their public key or a local name
const core = store.get({ name: 'my-first-core' })

await core.ready()

console.log('Core public key:', core.key.toString('hex'))
console.log('Core has', core.length, 'entries')

await core.append(Buffer.from('a block'))
```

1. Try running the above code a couple of times and see that the length of the core increases
2. Use `await core.get(index)` to read out a block
3. Use `sameCore = store.get(Buffer.from('the core key'))` to load the Hypercore from public key.

## Exercise 2 - Replicating a Corestore

Corestores and Hypercores can easily be replicated over Hyperswarm or any other stream based transport.

Let's try doing that. First you can use this file `seed.js` to easily make a feed that has a decent amount of data in a Hypercore.

```js
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'

const store = new Corestore('./seed-store')
const swarm = new Hyperswarm()

// Setup corestore replication
swarm.on('connection', (connection) => store.replicate(connection))

// Load a core by name
const core = store.get({ name: 'seeding-core' })

// Make sure the length is loaded
await core.ready()

// Join the Hypercore discoveryKey (a hash of it's public key)
swarm.join(core.discoveryKey)

// Insert 10000 blocks
while (core.length < 10000) {
  await core.append(Buffer.from('the next block of data. #' + core.length))
}

console.log('Core public key is:', core.key.toString('hex'))
```

Then use this scaffolding for the peer as `peer.js`

```js
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'

const store = new Corestore('./peer-store')
const swarm = new Hyperswarm()

// Setup corestore replication
swarm.on('connection', (connection) => store.replicate(connection))

// Load a core by public key
const core = store.get(Buffer.from('public-key-from-above', 'hex'))

await core.ready()

// Join the Hypercore discoveryKey (a hash of it's public key)
swarm.join(core.discoveryKey)

// Make sure we have all the connections
await swarm.flush()

// Make sure we have the latest length
await core.update()

// Print the length (should print 10000)
console.log('Core length is:', core.length)
```

1. Run the seed and modify the peer to use the public key from the seed.
2. Check that it prints the same length.
3. Modify the peer to get block 1453 as well and print it out
4. (Optional) Like before, try getting another workshop participant to load your Hypercore

# Next

When you are done continue to [Problem 4a](../04a)
