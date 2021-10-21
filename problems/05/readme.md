# (05) Creating Hypernews Posts


Now that we've understood Hyperswarm and Autobase we're going to combine
Autobase and Hyperswarm together to create a distributed command-line application
which will, over the next few exercises, allow for posting, upvoting, downvoting
and viewing the top 10 highest voted posts. 

## Introducing Hyperbee

In addition to Hyperswarm and Autobase we'll also be using Hyperbee.

Hyperbee provides a key-value store abstraction over the top of a Hypercore,
since an Autobase index is a Hypercore we can pass it into a Hyperbee  


## Utilizing `hrepl`

A REPL (Read-Eval-Print-Loop) such as the one provided when running `node` without
a file argument can be useful for experimentation and prototyping. The [`hrepl`](https://github.com/davidmarkclements/hrepl) tool
provides a REPL with some advanced functionality:

* It exposes the exports of a given file within the REPL
* It provides an easy logging command for iterable objects, which will be useful

Install `hrepl` with the following command:

```sh
% npm install -g hrepl
```

## Starting `hypernews.js` in `hrepl`

This folder contains a `hypernews.js` file, which is the starting point for this exercise.

Currently `hypernews.js` starts a swarm node and creates an autobase database. It exposes
an `all` method `start` method and an `info` method. The `info` method is called immediately 
and outputs information that includes a command that can be given to someone else to create a peer
connection. The `start` method is likewise called immediately and initializes the Autobase
and Hyperswarm instances.

The `all` method returns an iterator that supplies the posted entries stored in the autobase 
instance. Currently there are no entries, so it supplies no entries. 

To start `hypernews.js` in `hrepl` run the following command:

```
% hrepl hypernews.js
```

This should output something like the following:


```
Autobase setup. Pass this to run this same setup in another instance:

hrepl hypernews.js -n ff184becdab95cb0 -w ff184becdab95cb0b6f45910a25070967d446689fbcf51f4e3df97baeea2d718 -i 863acd316fbf151d18746782d195fba341b0399be1ba1bea5d00a794897b8480

To use another storage directory use --storage ./another
To disable swarming add --no-swarm

API: hypernews (object)
>
```

We can interact with the `hypernews` object, for example, if we we're to execute the following in `hrepl`:

```sh
> hypernews.info()
```

This will output the info again. 

An `hrepl` command starts with a dot and may take an argument after a space, the `.help` command
will display all commands, the `.exit` command will exit the REPL and the `.log` command can 
perform iterative logging. For example, run the following in `hrepl`: 

```sh
> .log [1, 2, 3]
```

This should result in the following:

```
> .log [1,2,3]
try { for await (const data of [1,2,3]) console.log(data) } catch { console.log([1,2,3]) }
1
2
3
```

The `.log` command is a shorthand for the command printed at the top of its output. 
It takes the input and then attempts to loop over it with a `for await` loop
(this works with both iterables and async-iterables), failing that it just passes the input to 
`console.log`. 

This will become more useful when logging async-iterables, which is what the `all` method returns. 

We can try to log out all of the posts but there will be nothing to output:

```sh
> .log hypernews.all()
try { for await (const data of [1,2,3]) console.log(data) } catch { console.log([1,2,3]) }
```

There's nothing to output because there are no posts. There are no posts becuase there's currently
no way to add posts.

## Excercise - Implement `hypernews.post()`

Create a `post` method on the `Hypernews` class that appends a log to `autobase`.

The `post` method should be an `async` method and take a single argument (`text`).

The appended message should be a serialized JSON object with the following fields:

* `type` - with value `'post'`
* `hash` - a sha256 of the text (the `sha256` function is provided in `hypernews.js`)
* `data` - the `text` argument passed to `post`

A log can be appended within a async method of the `Hypernews` class with:

```js
await this.autobase.append(<MESSAGE HERE>)
```

Once implemented, it should be callable within `hrepl`:


```sh
% hrepl hypernews.js                                                                                                                             interactive
Autobase setup. Pass this to run this same setup in another instance:

hrepl hypernews.js -n 83502500e6312a30 -w 83502500e6312a3015730b4d7020af6428825af5d02a32cb0b8992d46991a475 -i 469c49cae805f778843206ebcce7e83b5eedd354b4759f74d1241336ece33582

To use another storage directory use --storage ./another
To disable swarming add --no-swarm

API: hypernews (object)
> await hypernews.post('hello world')
> .log hypernews.all()
try { for await (const data of hypernews.all()) console.log(data) } catch { console.log(hypernews.all()) }
{
  hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  votes: 0,
  data: 'hello world'
}
```

# Next

When you are done continue to [Problem 6](../06)
