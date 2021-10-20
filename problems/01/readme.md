# P2P Networking with Hyperswarm

A massive part of P2P is just connecting computers with each other. Unlike a cloud based environment, connecting computers running at home is challenging. The vast majority of networks are locked down behind firewalls and NATs making running servers at home very non-trivial.

Luckily we've been spending the last many years trying to solve these problems by making Hyperswarm, a fully distributed and untrusted DHT, that helps computers at home penetrate through NATs to make direct connections to other computers.

Instead of using hostnames and ports, Hyperswarm uses key addressed networking. This means that servers (and clients) are identified by a cryptographic keypair.

Instead of doing `connect(port, hostname)` you do `connect(publicKey)` and instead of servers doing `listen(port)` we do `listen({ publicKey, secretKey })`.

This is a super powerful technique as it decouples the location at which a server has to be running. Additionally it also means that ALL connections can be end to end encrypted at all time as their address, ie public key, is the information you need cryptographically to bootstrap a fully secure session.

Hyperswarm implements this low level API in it's DHT module. Each instance of the DHT gossips with a global untrusted network to find other peers associated with a key pair. You can think of this as being conceptually similar to how routers gossip IPs to find each other as well.

## Exercise 1: Making servers and clients with the DHT

Let's try it out. First install the latest version of the Hyperswarm DHT module. It is available through NPM under the next tag.

```
npm install @hyperswarm/dht@next
```

Make two files server.js and client.js and add a package.json with `{ "type": "module" }` so ESM loading and top-level await works.

Then in server.js make a server:

```js
import DHT from '@hyperswarm/dht'

// Make a Hyperswarm DHT node that connects to the global network.
const node = new DHT()

const server = node.createServer(function (encryptedSocket) {
  // Called when a new connection arrives.
  console.log('New connection from', encryptedSocket.remotePublicKey.toString('hex'))
  encryptedSocket.write('Hello world!')
  encryptedSocket.end()
})

const keyPair = DHT.keyPair()
await server.listen(keyPair)

// Server is now listening.
console.log('Connect to:')
console.log(keyPair.publicKey.toString('hex'))
```

This example server creates a new key pair to listen on each time it's run, but prints out the public key. Copy the key it prints out and make a client in client.js:

```js
import DHT from '@hyperswarm/dht'

const node = new DHT()

const remotePublicKey = Buffer.from('hex-from-above', 'hex')
const encryptedSocket = node.connect(remotePublicKey)

encryptedSocket.on('open', function () {
  console.log('Connected to server')
})

encryptedSocket.on('data', function (data) {
  console.log('Remote said:', data.toString())
})
```

Now for the exercise.

1. Run `server.js` in one terminal and copy the public key it prints.
2. Modify `client.js` to use the key and run it in another terminal.
3. See that it prints the server response.

## Exercise 2:

P2P networks on the same computer is not as fun as P2P networks on remote computers.

1. Try getting another participant in the workshop to run your client.

Alternatively ssh into a server if you can and try or get a workshop host to run your client.
