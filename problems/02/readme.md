# Swarms, Swarms Everywhere!

Okay, so in the previous exercise we got our feet a little wet with the basics of P2P networking.
The `createServer` / `connect` apis are at the foundation of everything we do with P2P, but often when making applications we don't really care who is acting as a server and who is acting as a client. After all we are making P2P applications so both peers are usually both at once! Similarly we often want to group peers per application and make sure peers reconnect etc.

To avoid having to have users do all that work themself we usually use an abstraction on top of the Hyperswarm DHT api called ... a swarm. A swarm just represents a set of incoming and outgoing connections that are being maintained for you.

# Exercise 1

Let's try it out.

First install the main swarm abstraction. It's available as the main hyperswarm package. Again the latest one is released under the next tag.

```
npm install hyperswarm@next
```

Then make a file called `swarm.js` and add the following:

```js
import Hyperswarm from 'hyperswarm'
import crypto from 'crypto'

const swarm = new Hyperswarm()

// Swarms abstract away servers and clients and just gives you connections
swarm.on('connection', function (encryptedSocket) {
  console.log('New connection from', encryptedSocket.remotePublicKey.toString('hex'))

  encryptedSocket.write('Hello world!')

  encryptedSocket.on('data', function (data) {
    console.log('Remote peer said:', data.toString())
  })
  encryptedSocket.on('error', function (err) {
    console.log('Remote peer errored:', err)
  })
  encryptedSocket.on('close', function () {
    console.log('Remote peer fully left')
  })
})

// Topics are just identifiers to find other peers under
const topic = crypto.createHash('sha256').update('Insert a topic name here').digest()
swarm.join(topic)
```

Now do the following:

1. Replace the topic name above with something unique for you (could be your name).
2. Try running two or more instances of the swarm, see that the connect together.
3. Make sure it prints hello world for each peer you add.

# Exercise 2

Let's make a tiny small function program out of our swarm. Let's turn it into a simple chat service.

If we change to body of the connection handler to do this:

```js
process.stdin.pipe(encryptedSocket).pipe(process.stdout)
```

Then we are effectively pipeing each peer to stdout out and piping our stdin to all peers - a silly chat!.

1. Update the code with the above change.
2. Try running multiple instances and type something and hit enter and see your messages appear with other peers.
3. Like in the previous exercise try sharing your chat topic with other people in the workshop and do a simple 5 line, end to end encrypted cross internet chat.

# Next

When you are done continue to [Problem 3](../03)

