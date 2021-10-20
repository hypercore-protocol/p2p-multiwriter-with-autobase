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

