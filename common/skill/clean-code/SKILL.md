---
name: clean-code
description: Some suggestions if the user asks for clean code.
---

A codebase is the ontological representation of the program's intent. If we express that intent clearly, every iteration thereafter will be better and faster.

This is a practical and philosophical guide to help you write better code. It requires you think beyond the codebases current features and imagine and design for what the codebase does once it has reached maturity.

## Strategic

## 1. Create contracts

A complex system has essential complexity, which is usually best expressed by modelling the contracts between things. 

Look for instances of connascence that cut across boundaries. In each case, ask if you can lower the strength of that connascence:

- for shared meaning, can you define domain types that gives that meaning a name?
- for shared algorithms, can you colocated both sides of that algorithm into a shared package?
- for timing, can you model explicit async and durable primitives, or lift the sequence into a higher order abstraction?
- for conrete types, can you give it a name, make it generic, or model it with a schema?
- for values, can you identify where the single source of truth is?

## 2. Call each thing by its right name

Identify unamed patterns, higher-order functions, and interfaces hidden in the codebase. At the most fundamental level, what is it? A reactive paradigm? Isomorphism? Principle of least power?

Can those named patterns now be lifted into a package, a utility set, an interface, or even a seperate repository. If not, should the named thing be surface in the code, comments and documentation?

## 3. Put everything in its proper place

You are like a librarian. You don't sort books by their height or colour; you organise them so that they can be easily found by curious visitors. The file path is a route map.

This is more art than sceince because entities do not naturally organise into a tree; rather they form a graph of cross cutting concerns. It is therefore a series of tradeoffs to decide how to group each entity.

## 4. Choose the least powerful abstraction

To quote Tim Berners-Lee:

> The less powerful the language, the more you can do with the data stored in that language. If you write it in a simple declarative from, anyone can write a program to analyze it.

This principle applies to everything from data modelling to permissions. Ask: is there less powerful way to achieve the same thing? If there is, do that. 

## 5. Design for an audience

Imagine that each part of the codebase is going to be worked on by different teams. Do those parts make sense on their own. Can that team work effectively on their task in isolation without having to communicate with other teams? 

We are, of course, talking about the single responsibility principle. It makes code easier to understand and safer to change.

## 6. Lower the cost of ownership

If there is already an existing library designed for the particular purpose, don't not use it just because it adds a few bytes 4KB or only saves a few lines of code today.

Authors of mature libraries have put a lot of thought into their design, and those decisions not only save us time, but also drop us into the pit of success. A few extra KBs to the bundle is a tiny price to pay for that.


## Tactical

## 1. Decide on a route map

The architecture of the app should be comprehensible from `tree -L 3 --gitignore`; the purpose of each module comprehensible from its signature.

There are no hard and fast rules, but each level in the tree heirarchy should contain complementary entities e.g. grouped by domain, type, role, capabilities.

Example 1: The conventions of each domain is reflected in the file path. Filenames are namespaced to avoid dozens of files with the same name. Some modules may be small but each module has a clear purpose and space to grow more complex logic.

```
├── domains
│  ├── auth
│  │  ├── auth.db.ts
│  │  ├── auth.hooks.ts
│  │  ├── auth.queries.ts
│  │  └── auth.types.ts
│  ├── billing
│  │  ├── billing.cache.ts
│  │  ├── billing.db.ts
│  │  ├── billing.hooks.ts
│  │  ├── billing.queries.ts
│  │  ├── billing.types.ts
│  │  ├── billing.utils.test.ts
│  │  └── billing.utils.ts
│  ├── channels
│  │  ├── channels.cache.ts
│  │  ├── channels.channels.ts
│  │  ├── channels.db.ts
│  │  ├── channels.hooks.ts
│  │  ├── channels.mutations.ts
│  │  ├── channels.queries.ts
│  │  ├── channels.realtime.ts
│  │  └── channels.types.ts
```

Example 2: The helps the visitor to form a rough dependency graph and find the contractual "front door". There was no need to go another level deep because each module contains sets of similar entities. An extra level might be necessary if, for example, config could also be grouped by domain.

```
├── index.ts
├── interfaces
│  ├── db.ts
│  ├── index.ts
│  ├── machine.ts
│  ├── operators.ts
│  └── task.ts
├── internal
│  ├── config.ts
│  ├── db.ts
│  ├── execution.ts
│  └── utils.ts
├── exports
│  ├── saga.ts
│  ├── machine.ts
│  ├── operators.ts
│  └── task-machine.ts
```

Breaking up code in to files and folders helps avoid having one location for multiple concepts. 

Conversely, grouping entities helps avoid having multiple locations for the same concept.

## 2. Create your own lodash

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

## 3. Build the libraries you wish existed

Often building on top of the utilities, complex operations can be decomponsed into composable primitives that not only allow you to achieve the program's immediate goals, but probably future goals.

## 4. Avoid indirection

One example: a program that has been split into functions that take on a particular task. Ideally modules run top to bottom – clearly story. A module where you have to jump up and down to follow the control flow obscures the intent of the program.

So, use this rule as a check. When you create an abstraction, ask if it is introducing indirection.

## 5. Co-locate code that rhymes

Modules that do lots of different looking things obscure the ontological shape of the codebase. A module should have a theme, which is ideally identifiable from it's file path.

## 6. Lean into functional programming paradigms

Without being religious about it, take the principles from functional programming that help. Describe small functions by what they do, and then compose them together. Use higher-order functions to formalise common behaviours.

## 7. Use lib folders as holding area for code that has no clear abstraction yet

The lib folder acts as a middle ground between the public API and your project's utils. Generally have one lib folder per package or service. Their code is often composed from utils.

In my experience, the lib folder becomes smaller (and often disappears) as the project's abstractions crystallise. 

## 8. Let the TypeScript compiler pay its rent

Don't add types for everything. If it can be inferred, just let it be inferred (except in rare cases where it's an actual performance concern). 

Do spend time on making sure functions are typed with well thought out generics so that inference at the call site is effortless.

Types that represent contracts should be in their own module/folder. Consider if the contract should in fact be a schema in which case use zod/valibot/arktype.
