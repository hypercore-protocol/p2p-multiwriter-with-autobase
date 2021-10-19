import DHT from '@hyperswarm/dht'

if (!process.argv[2]) {
  console.error('Usage: node 1-client.js <server-public-key>')
  process.exit(1)
}

const dht = new DHT()
const publicKey = Buffer.from(process.argv[2], 'hex')

const socket = dht.connect(publicKey) // Connect to the server and start chatting
process.stdin.pipe(socket).pipe(process.stdout)
socket.once('open', () => {
  console.log('Connected to:', socket.remotePublicKey.toString('hex'))
})
