# (07) Creating Hypernews Top Posts

In this exercise we'll finalize the Hypernews app with functionality that 
allows ordering of posts by votes.

## Lexicographical Ordering

Lexicographic essentially means alphabetical, the key point is that numbers are treated
as strings. So for instance, lexicographically `10` comes before `2`.

All keys are currently prefixed with `post!`. The `all` function creates a read stream
from the `bee` key-value store of all keys greater than `post!` and less than `post!~`. 
Since all hashes are hexadecimal, regardless of the hash size, it can only contain
characters from 0 to F - the tilde (`~`) is lexiographically greater than F. So this 
results in a read stream that provides all keys prefixed with `post!`.

A new key prefix can be introduced to create ("persistently materialize") a list of 
posts ordered by total votes. We'll call it `top!`. 

Combining this prefix with a lexicographical representation of the total count key,
means keys will automatically be ordered.

The [`lexicographic-integer` module](https://github.com/substack/lexicographic-integer)
can be used to convert the vote counts into a hexadecimal representation that will be 
ordered per the highest amount. 

This is imported in `hypernews.js` as `lexint`. 

A `top!` key should be created like so: `'top!' + lexint.pack(<amount of votes>, 'hex') + '!' + <post hash>`.


## Excercise - Implement Top Posts

The `apply` function passed to `autobase.createRebasedIndex()` needs to be modified once more,
and a new `top` function needs to be added to the `Hypernews` class.

The `top` function should look like so:

```js
  async * top () {
    for await (const data of this.bee.createReadStream({ gt: 'top!', lt: 'top!~', reverse: true })) {
      const { value } = (await this.bee.get('posts!' + data.value))
      yield value
    }
  }
```

This method will not work until the `apply` function has been modified, but it can help to 
create this method and then think about what needs to be added to the `apply` function to support it.

Similar to the `all` function it is an async function generator that yields out entries by iterating over
a read stream as it supplies all entries between `top!` and `top!~`. However this time it's in reverse, 
because the entries with the highest votes will have the highest lexicographical value.

The resulting `data` object of each iteration of the read stream contains a `value` property which
should be the hash of a post entry, so this can be concatenated to the `posts!` prefix in order
to fetch that actual post entry from the `bee`. The resulting object has a `value` property which is
destructured and yielded out.

Now modify the `apply` function passed to `autobase.createRebasedIndex()` to meet the following criteria:

* In addition to a `posts!` put for ops with `type` of `'post'`, create another put to a key `'top!' + lexint.pack(0, 'hex') + '!' + hash`. The 0 is for zero votes, which is the initial value of vote. The value of this put should be the hash.
* For ops with a `type` of `'vote'`, *before* updating the vote count remove any existing `top!` prefixed key:             `await b.del('top!' + lexint.pack(<current vote count>, 'hex') + '!' + op.hash)`
* After increasing the vote and adding a `post!` put, add one more `top!` put which uses `lexint.pack` to encode the new vote amount for that entry.

Once the `top` function has been added and the criteria is met, it should be possible to use `hypernews.top()` in `hrepl`:

```sh
% hrepl hypernews.js                                                                                                                             interactive
Autobase setup. Pass this to run this same setup in another instance:

hrepl hypernews.js -n 0ef649a8f74234d8 -w 0ef649a8f74234d8898043e5376a269d6f27d980ca86d8a00093d76f57341d18 -i 3388ba1d9a37a96fc8f2ab25725b73b168632769aac771ae4cf34f3ed0d18790

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
> .log hypernews.top()
try { for await (const data of hypernews.top()) console.log(data) } catch { console.log(hypernews.top()) }
{
  hash: 'ef72c47db2a417b486c04a1b823eec2f95f2e3d373395b3bbdf80cbaf0a8aed5',
  votes: 1,
  data: 'sup earth'
}
{
  hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  votes: 0,
  data: 'hello world'
}
```

That's it for the workshop!

We encourage you to continue tinkering with the application here. Maybe add an index showing who upvoted and who downvoted?

If you are interested in learning more and keeping up with the ecosystem, join our discord at https://chat.hypercore-protocol.org
