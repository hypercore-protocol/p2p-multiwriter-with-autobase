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
