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

## 3. Design for an audience

Imagine that each part of the codebase is going to be worked on by different teams. Do those parts make sense on their own. Can that team work effectively on their task in isolation without having to communicate with other teams? 

We are, of course, talking about the single responsibility principle. It makes code easier to understand and safer to change.

## 4. Choose the least powerful abstraction

To quote Tim Berners-Lee:

> The less powerful the language, the more you can do with the data stored in that language. If you write it in a simple declarative from, anyone can write a program to analyze it.

This principle applies to everything from data modelling to permissions. Ask: is there less powerful way to achieve the same thing? If there is, do that. 


## Tactical

## 1. Lower the cost of ownership

```
Me: "shall we use {library designed for this exact purpose}"

Agent: "not yet. it will add 4KB and save only 10 LoC"

Me: "ok, you the boss"

Agent: *proceeds to write 750 lines of pure indirection*
```

Don't be that agent.

## 2. Build your own lodash

To write code that tells a story, you need building blocks that name behaviours.

Build your own lodash – normally in a utilities package for the whole repo (because the behaviours are inherently general even if there is only a single consumer). Organise utilities by domain or type. 

If the utility has state or builds on an existing object, make it a class. 

```
const gh = new Github()

const commit = await gh.repo.headOf(branch);
const configSha = await gh.repo.subtree(commit, CONFIG_DIR);
```

If it doesn't have state, just make it an object (namespacing also tells a story).

```
const math = {
  sqrt: () => {}
}
```

## 3. Avoid indirection

One example: a program that has been split into functions that take on a particular task. Ideally modules run top to bottom – clearly story. A module where you have to jump up and down to follow the control flow obscures the intent of the program.

So, use this rule as a check. When you create an abstraction, ask if it is introducing indirection.

## 4. Co-locate code that rhymes

Modules that do lots of different looking things obscure the ontological shape of the codebase. A module should have a theme, which is ideally identifiable from it's file path.

## 4. Lean into functional programming paradigms

Without being religious about it, take the principles from functional programming that help. Describe small functions by what they do, and then compose them together. Use higher-order functions to formalise common behaviours.

## 5. Use lib folders as holding area for code that has no clear abstraction yet

The lib folder acts as a middle ground between the public API and your project's utils. Generally have one lib folder per package or service. Their code is often composed from utils.

In my experience, the lib folder becomes smaller (and often disappears) as the project's abstractions crystallise. 

## 6. Let the TypeScript compiler pay its rent

Don't add types for everything. If it can be inferred, just let it be inferred (except in rare cases where it's an actual performance concern). 

Do spend time on making sure functions are typed with well thought out generics so that inference at the call site is effortless.

Types that represent contracts should be in their own module/folder. Consider if the contract should in fact be a schema in which case use zod/valibot/arktype.

## 7. Create the libraries you wish you had

Does the program have some features that are in themselves particularly complex? Wouldn't it be great if there was a library that already solved this for you? 

If there is, use it. But if not, create it. Create the perfect library you wish you had. Design it not for this use case, but what would be the most composable primitive to achieve its likely goals.
