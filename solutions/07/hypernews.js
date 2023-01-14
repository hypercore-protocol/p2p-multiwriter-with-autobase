import minimist from 'minimist'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import Autobase from 'autobase'
import Hyperbee from 'hyperbee'
import crypto from 'crypto'
import lexint from 'lexicographic-integer'
import ram from 'random-access-memory'

const args = minimist(process.argv, {
  alias: {
    inputs: 'i',
    outputs: 'o',
    storage: 's',
    name: 'n'
  },
  default: {
    swarm: true
  },
  boolean: ['ram', 'swarm']
})

class Hypernews {
  constructor () {
    this.store = new Corestore(args.ram ? ram : (args.storage || 'hypernews'))
    this.swarm = null
    this.autobase = null
    this.bee = null
    this.name = null
  }

  async start () {
    const writer = this.store.get({ name: 'writer' })
    const viewOutput = this.store.get({ name: 'view-output' })

    await writer.ready()

    this.name = args.name || writer.key.slice(0, 8).toString('hex')
    this.autobase = new Autobase({
        inputs: [writer],
        localInput: writer,
        outputs: [viewOutput]
    })

    for (const i of [].concat(args.inputs || [])) {
      await this.autobase.addInput(this.store.get(Buffer.from(i, 'hex')))
    }

    for (const o of [].concat(args.outputs || [])) {
      await this.autobase.addOutput(this.store.get(Buffer.from(o, 'hex')))
    }

    await this.autobase.ready()

    if (args.swarm) {
      const topic = Buffer.from(sha256(this.name), 'hex')
      this.swarm = new Hyperswarm()
      this.swarm.on('connection', (socket) => this.store.replicate(socket))
      this.swarm.join(topic)
      await this.swarm.flush()
      process.once('SIGINT', () => this.swarm.destroy()) // for faster restarts
    }

    this.info()

    const self = this
    this.autobase.start({
      unwrap: true,
      async apply (view, batch) {
        const b = self.bee.batch({ update: false })

        for (const { value } of batch) {
          const op = JSON.parse(value)

          if (op.type === 'post') {
            const hash = sha256(op.data)
            await b.put('posts!' + hash, { hash, votes: 0, data: op.data })
            await b.put('top!' + lexint.pack(0, 'hex') + '!' + hash, hash)
          }

          if (op.type === 'vote') {
            const inc = op.up ? 1 : -1
            const p = await self.bee.get('posts!' + op.hash, { update: false })

            if (!p) continue

            await b.del('top!' + lexint.pack(p.value.votes, 'hex') + '!' + op.hash)
            p.value.votes += inc
            await b.put('posts!' + op.hash, p.value)
            await b.put('top!' + lexint.pack(p.value.votes, 'hex') + '!' + op.hash, op.hash)
          }
        }

        await b.flush()
      },
      view (core) {
        return new Hyperbee(core.unwrap(), { // .unwrap() might become redundant if https://github.com/holepunchto/autobase/pull/33 gets merged
          extension: false,
          keyEncoding: 'utf-8',
          valueEncoding: 'json'
        })
      }
    })

    this.bee = this.autobase.view
  }

  info () {
    let localInputHex = this.autobase.localInput.key.toString('hex')
    console.log('Autobase setup. Use this to run a second instance:')
    console.log()
    console.log('hrepl hypernews.js ' +
      '-n ' + this.name + ' ' +
      this.autobase.inputs.map(i => '-i ' + i.key.toString('hex')).join(' ') + ' ' +
      this.autobase.outputs.map(i => '-o ' + i.key.toString('hex')).join(' ') +
      ' --storage ./instance2'
    )
    console.log()
    console.log('To disable swarming add --no-swarm')
    console.log()
    console.log('Note: for the first instance to accept updates of the second instance, it needs to have the second instance as an input.')
    console.log('This can be achieved by starting it with the -i ' + localInputHex + ' option')
    console.log('or at runtime with: hypernews.autobase.addInput(hypernews.store.get(Buffer.from(\'' + localInputHex + '\', \'hex\')))')
  }


  async * all () {
    for await (const data of this.bee.createReadStream({ gt: 'posts!', lt: 'posts!~' })) {
      yield data.value
    }
  }

  async * top () {
    for await (const data of this.bee.createReadStream({ gt: 'top!', lt: 'top!~', reverse: true })) {
      const { value } = (await this.bee.get('posts!' + data.value))
      yield value
    }
  }

  async post (text) {
    const hash = sha256(text)

    await this.autobase.append(JSON.stringify({
      type: 'post',
      hash,
      data: text
    }))
  }

  async upvote (hash) {
    await this.autobase.append(JSON.stringify({
      type: 'vote',
      hash,
      up: true
    }))
  }

  async downvote (hash) {
    await this.autobase.append(JSON.stringify({
      type: 'vote',
      hash,
      up: false
    }))
  }
}

export const hypernews = new Hypernews()

await hypernews.start()

function sha256 (inp) {
  return crypto.createHash('sha256').update(inp).digest('hex')
}
