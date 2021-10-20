# (06) Creating Hypernews Voting

In this exercise we'll create a voting system for our Hypernews posts. 

## Persistent, indexed, materialized views

Within the `start` method of the `Hypernews` class, an Autobase index is created by invoking
`this.autobase.createRebasedIndex()`. The options object passed to that function contains an
`apply` function - see [hypernews.js#L65-80](hypernews.js#L65-80). 

The `autobase.createRebasedIndex()` creates a materialized view over the input hypercores,
`apply` configures how that view is persisted.

The `apply` function isn't called when entries are writen to `autobase`, instead it's called on read 
(for instance, when the `hypernews.all()` function is called, it calls `bee.createReadStream`). Once
an entry has been processed by apply, it will not be processed again (e.g. it's idempotent).


Currently the `apply` function looks like this:

```js
async apply (batch) {
  const b = self.bee.batch({ update: false })

  for (const { value } of batch) {
    const op = JSON.parse(value)

    if (op.type === 'post') {
      const hash = sha256(op.data)
      await b.put('posts!' + hash, { hash, votes: 0, data: op.data })
    }

  }

  await b.flush()
}
```

The `index` itself is actually the storage core for the `Hyperbee` instance (the p2p key value store - `bee`).
On top of that, the `apply` function writes what could be considered "views" back into 
the `bee`. The `b` constant here is a batching object of the `bee`, it allows for many ops in the `for of` loop 
to be sent at one time when `b.flush()` is called. The reason `{ update: false }` is passed to `self.bee.batch` 
when creating the `b` constant, is it stops the `apply` function from being called when the puts are written
(otherwise you could end up in infinite recursion).


## Excercise - Implement voting

The `apply` function passed to `autobase.createRebasedIndex()` currently supports one type of operation: `'post'`.

Extend the `apply` function to meet the following criteria:

* Modify the `apply` function to support another type: `op.type === 'vote'`. 
* For vote ops, use `op.hash` to get a particular post entry from the bee: `await bee.get('posts! + op.hash, { update: false })`
* If the result isn't found, bail out (`continue` from the loop)
* Check `op.up` to see whether to upvote or downvote an item. 
* Increment or decrement the votes amount on a post accordingly
* Add a put to the `b` batch instance for that post, passing the updated votes (and other values) to it: `await b.put('posts!' + op.hash, <updated entry>)`

Once this has been completed we can add the `upvote` and `downvote` methods to the `Hypernews` class. 

They're very similar to the `post` method, except they take a `hash` (instead of `text`), the `type` is `'vote'` (which we look for in the `apply` function), and instead of a `data` property there's an `up` property: 

```js
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
```

Once the methods are added to `Hypernews` we should be able to check everything is working using `hrepl`:

```sh
% hrepl hypernews.js
Autobase setup. Pass this to run this same setup in another instance:

hrepl hypernews.js -n bc9560e19f971939 -w bc9560e19f971939f2c3b917fc1399e8aea948f118187d81b93d709be92ef722 -i ead863d693da7794840a7871a64cacbaa98dfaa7a02852355afbf23b48bd9cc9

To use another storage directory use --storage ./another
To disable swarming add --no-swarm

API: hypernews (object)
> await hypernews.post('hello world')
> await hypernews.post('sup earth')
> .log hypernews.all()
try { for await (const data of hypernews.all()) console.log(data) } catch { console.log(hypernews.all()) }
{
  hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  votes: 0,
  data: 'hello world'
}
{
  hash: 'ef72c47db2a417b486c04a1b823eec2f95f2e3d373395b3bbdf80cbaf0a8aed5',
  votes: 0,
  data: 'sup earth'
}
> await hypernews.upvote('ef72c47db2a417b486c04a1b823eec2f95f2e3d373395b3bbdf80cbaf0a8aed5')
> .log hypernews.all()
try { for await (const data of hypernews.all()) console.log(data) } catch { console.log(hypernews.all()) }
{
  hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  votes: 0,
  data: 'hello world'
}
{
  hash: 'ef72c47db2a417b486c04a1b823eec2f95f2e3d373395b3bbdf80cbaf0a8aed5',
  votes: 1,
  data: 'sup earth'
}
```


