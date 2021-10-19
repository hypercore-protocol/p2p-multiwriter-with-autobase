#!/usr/bin/env node
import readline from 'readline'
import Autobase from 'autobase'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import Hyperbee from 'hyperbee'
import crypto from 'crypto'
import lexint from 'lexicographic-integer'
import minimist from 'minimist'
import esc from 'ansi-escapes'
import Menu from 'menu-string'
import { bold, inverse } from 'colorette'

const topic = Buffer.from(sha256('cool-app-2'), 'hex')

const argv = minimist(process.argv.slice(2), {
  alias: { writers: 'w', indexes: 'i', storage: 's' }
})

const store = new Corestore(argv.storage || './links')

const writer = store.get({ name: 'writer' })
const autobaseIndex = store.get({ name: 'index' })

const base = new Autobase([writer], { indexes: autobaseIndex })

for (const w of [].concat(argv.writers || [])) {
  await base.addInput(store.get(Buffer.from(w, 'hex')))
}

for (const i of [].concat(argv.indexes || [])) {
  await base.addDefaultIndex(store.get(Buffer.from(i, 'hex')))
}

await base.ready()

console.log('Autobase setup. Pass this to run this same setup in another instance:')
console.log('node app.js ' +
  base.inputs.map(i => '-w ' + i.key.toString('hex')).join(' ') + ' ' +
  base.defaultIndexes.map(i => '-i ' + i.key.toString('hex')).join(' ')
)

const index = base.createRebasedIndex({
  unwrap: true,
  async apply (batch) {
    const b = bee.batch({ update: false })

    for (const { value } of batch) {
      const op = JSON.parse(value)

      if (op.type === 'post') {
        const hash = sha256(op.data)
        await b.put('posts!' + hash, { votes: 0, data: op.data })
        await b.put('top!' + lexint.pack(0, 'hex') + '!' + hash, hash)
      }

      if (op.type === 'vote') {
        const inc = op.up ? 1 : -1
        const p = await bee.get('posts!' + op.hash, { update: false })

        if (!p) continue

        await b.del('top!' + lexint.pack(p.value.votes, 'hex') + '!' + op.hash)
        p.value.votes += inc
        await b.put('posts!' + op.hash, p.value)
        await b.put('top!' + lexint.pack(p.value.votes, 'hex') + '!' + op.hash, op.hash)
      }
    }

    await b.flush()
  }
})

const bee = new Hyperbee(index, {
  extension: false,
  keyEncoding: 'utf-8',
  valueEncoding: 'json'
})

console.log('Swarming... Run CTRL-C to kill it.')
const swarm = new Hyperswarm()
swarm.on('connection', socket => store.replicate(socket))
swarm.join(topic)
process.once('SIGINT', () => swarm.destroy())
await swarm.flush()
console.log('Swarm is flushed.')

if (argv.ui) {
  await ui()
} else {
  if (argv.post) {
    await base.append(JSON.stringify({ type: 'post', hash: sha256(argv.post), data: argv.post }))
    console.log('Posted!')
  }
  if (argv.up) {
    await base.append(JSON.stringify({ type: 'vote', hash: argv.up, up: true }))
    console.log('Upvoted :)')
  }
  if (argv.down) {
    await base.append(JSON.stringify({ type: 'vote', hash: argv.down, up: false }))
    console.log('Downvoted :(')
  }
  if (argv.top) print(top())
  if (argv.all) print(all())
  await index.update()
}

async function * top () {
  for await (const data of bee.createReadStream({ gt: 'top!', lt: 'top!~', reverse: true })) {
    yield await bee.get('posts!' + data.value)
  }
}

async function * all () {
  for await (const data of bee.createReadStream({ gt: 'posts!', lt: 'posts!~' })) {
    yield data
  }
}

async function print (data) {
  if (data) {
    if (data[Symbol.asyncIterator]) {
      const iter = data[Symbol.asyncIterator]()
      for await (const data of iter) print(data)
      return
    }
    console.log(data.key.split('!').pop() + ':', data.value)
  }
}

function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

async function spread (iter) {
  const items = []
  for await (const item of iter) items.push(item)
  return items
}

async function ui (posts = top) {
  const items = await spread(posts())
  if (items.length === 0) {
    console.log('No posts to display in ui!')
    process.exit(1)
  }

  process.stdout.write(esc.clearScreen)
  process.stdin.setRawMode(true)
  readline.emitKeypressEvents(process.stdin)

  console.log(`Key: ${bold('a')} - all  ${bold('t')} - top  ${bold('u')} - upvote  ${bold('d')} - downvote`)
  process.stdout.write(esc.cursorHide)
  process.on('exit', () => process.stdout.write(esc.cursorShow))

  process.stdin.on('keypress', async (ch, key) => {
    if (key.name === 'c' && key.ctrl) {
      console.log('\nShutting down..')
      await swarm.destroy()
      process.exit(127)
    }
    if (key.name === 'up') menu.up()
    if (key.name === 'down') menu.down()
    if (key.name === 'u' || key.name === 'd') {
      const item = menu.selected()
      await base.append(JSON.stringify({ type: 'vote', hash: item.key.split('posts!')[1], up: key.name === 'u' }))
      await index.update()
      menu = await createMenu()
      menu.select(item.index)
      renderMenu()
    }
    if (key.name === 't' || key.name === 'a') {
      posts = key.name === 't' ? top : all
      const item = menu.selected()
      await index.update()
      menu = await createMenu()
      menu.select(item.index)
      renderMenu()
    }
  })

  const createMenu = async () => {
    const menu = new Menu({
      items: items,
      render (item, selected) {
        const { votes, data } = item.value
        const text = `${data} [${votes}]`
        return selected ? inverse(text) : text
      }
    })
    menu.on('update', renderMenu)
    return menu
  }

  
  let menu = await createMenu()

  process.stdout.write(esc.cursorSavePosition)
  process.stdout.write('\n')
  process.stdout.write(bold('# Top\n'))
  process.stdout.write(menu.toString())

  async function renderMenu () {
    process.stdout.write(esc.cursorRestorePosition)
    process.stdout.write(esc.eraseDown)
    process.stdout.write(esc.cursorDown(1))
    process.stdout.write(bold(posts === top ? '# Top' : '# All') + '\n')
    process.stdout.write(menu.toString())
  }
}
