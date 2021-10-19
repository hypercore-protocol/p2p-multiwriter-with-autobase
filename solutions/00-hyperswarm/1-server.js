import DHT from '@hyperswarm/dht'

// A @hyperswarm/dht server looks quite a lot like a Node.js TCP server
const dht = new DHT()
const server = dht.createServer(socket => {
  console.log('Got a connection from:', socket.remotePublicKey.toString('hex'))
  process.stdin.pipe(socket).pipe(process.stdout)
})

// Create a new keypair (an "address") for this server
const keyPair = DHT.keyPair() 

// Now the server has been announced on the DHT, and is awaiting connections
await server.listen(keyPair) 

// Connect to the server with `node 1-client.js <key>`
console.log('Server listening on:', keyPair.publicKey.toString('hex'))
