import Hyperswarm from 'hyperswarm'
import { randomBytes } from 'crypto'

// The swarm lets you discover and connect to peers who share a common topic
const swarm = new Hyperswarm()

swarm.on('connection', conn => {
  console.log('Got a connection to:', conn.remotePublicKey.toString('hex'))
  const localId = conn.publicKey.toString('hex').slice(0, 8)
  const remoteId = conn.remotePublicKey.toString('hex').slice(0, 8)

  conn.on('data', data => console.log(`${remoteId}: ${data.toString()}`))
  process.stdin.pipe(conn)
})

const topic = process.argv[2] ? Buffer.from(process.argv[2], 'hex') : randomBytes(32)

// The `client` and `server` options declare if we want to discover peers to connect to, and announce ourselves as connectable, respectively.
swarm.join(topic, { client: true, server: true })

// Share the topic with any number of 2.js instances: `node 2.js <topic>`
console.log('Joined topic:', topic.toString('hex'))

