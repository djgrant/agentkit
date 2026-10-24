# Clean Code: Contracts and Composition

## Rule 1: Tame essential coupling

Look for instances of connascence that cut across boundaries. In each case, ask if you can lower the strength of that connascence:

- for shared meaning, can you define domain types that gives that meaning a name?
- for shared algorithms, can you colocated both sides of that algorithm into a shared package?
- for timing, can you model explicit async and durable primitives, or lift the sequence into a higher order abstraction?
- for conrete types, can you give it a name, make it generic, or model it with a schema?
- for values, can you identify where the single source of truth is?

## Rule 2: Choose the least powerful abstraction

To quote Tim Berners-Lee:

> The less powerful the language, the more you can do with the data stored in that language. If you write it in a simple declarative from, anyone can write a program to analyze it.

This principle applies to everything from data modelling to permissions. Ask: is there less powerful way to achieve the same thing? If there is, do that.

## Rule 3: If there is a library, use it

If there is already an existing library designed for the particular purpose, don't not use it just because it adds a few bytes 4KB or only saves a few lines of code today.

Authors of mature libraries have put a lot of thought into their design, and those decisions not only save us time, but also drop us into the pit of success. A few extra KBs to the bundle is a tiny price to pay for that.

## Rule 4: Otherwise, build the libraries you wish existed

Often building on top of the utilities, complex operations can be decomponsed into composable primitives that not only allow you to achieve the program's immediate goals, but probable future goals.

## Rule 5: Make each part responsible for one thing

Imagine that each part of the codebase is going to be worked on by different teams. Do those parts make sense on their own. Can that team work effectively on their task in isolation without having to communicate with other teams? 

The single responsibility principle makes code easier to understand and safer to change.

## Tactic 1: Create your own lodash

To write code that tells a story, you need building blocks that name behaviours.

If there doesn't already exist a library for the particular purpose, build your own lodash. The more granular, the better. This is typically a utilities package for the whole repo (because it should contain general-purpose behaviours even if, in the first instance, only has a single consumer). Organise utilities by domain e.g. github, math, async etc. 

If the utility has state or builds on an existing object, make it a class. 

```
const gh = new Github(config)

const commit = await gh.repo.headOf(branch);
const configSha = await gh.repo.subtree(commit, CONFIG_DIR);
```

If it doesn't have state, just make it an object (namespacing also tells a story).

```
const res = math.sqrt(4)
```

## Tactic 2: Lean into functional programming paradigms

Without being religious about it, take the principles from functional programming that help. Describe small functions by what they do, and then compose them together. Use higher-order functions to formalise common behaviours.
