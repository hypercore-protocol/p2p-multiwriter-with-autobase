import Corestore from 'corestore'

const store = new Corestore('./store')

// You can access cores from the store either by their public key or a local name
const core = store.get({ name: 'my-first-core' })

await core.ready()

console.log('Core public key:', core.key.toString('hex'))
console.log('Core has', core.length, 'entries')

await core.append(Buffer.from('a block'))
