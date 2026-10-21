---
name: clean-code
description: Some suggestions if the user asks for clean code.
---

## 1. Use libraries

```
Me: "shall we use {library designed for this exact purpose}"

Agent: "not yet. it will add 4KB and save only 10 LoC"

Me: "ok, you the boss"

Agent: *proceeds to write 750 lines of pure indirection*
```

Don't be that agent.

## 2. Build your own lodash

About that 750 lines of code. So maybe it's not *pure* indirection. But, does it tell a story?

A codebase is the ontological representation of the program's intent. If we express that intent clearly, every iteration thereafter will be better and faster.

So build your own lodash. Create a utilities package. Organise utilities by domain or type. 

If the utility has state or builds on an existing object, make it a class. 

```
const gh = new Github()

const commit = await gh.repo.headOf(branch);
const configSha = await gh.repo.subtree(commit, CONFIG_DIR);
```

If it doesn't have state, just make it an object.

```
const math = {
  sqrt: () => {}
}
```

Why objects? Because namespacing also tells a story (including provenance).

## 3. Do not split code into functions

Ideally modules run top to bottom. You don't have to jump up and down finding function definition. Functions should never be created to "split the module up". Create functions when there is a clear abstraction.

## 4. Function programming is actually good

You may not need to go full monad, but functional composition is a consistent win. Describe small functions by what they do, and then compose them together. Compose and pipe are 90% of the time not really that helpful for elegant code, but sometimes it makes sense.

## 5. Create contracts

A complex system has essential complexity and that is usually best expressed by modelling the contracts between things. 

Where you draw the seam will vary. Sometimes it's a lib folder; other times it's a package.

## 6. The lib folder

Lib is a middle ground by the surface API and the utils. Units of logic that apply only to that package. They're often composed from utils.

If you have a perfect set of utils, your lib, if you need it, will be quite small.

## 7. Keep to a theme

Long modules are not a problem per se.

The problem is modules that do lots of different looking things. 

You don't want 100 different modules containing one function each. You want several modules that are self-contained, have a clear remit, and has code inside that generally rhymes. 

## 8. Let the TypeScript compiler pay its rent

Don't add types for everything. If it can be inferred, just let it be inferred (except in rare cases where it's an actual performance concern). 

Write abstractions with good generics. 

Types that represent contracts should be in their own module/folder. 

Consider if the contract should in fact be a schema in which case use zod/valibot/arktype.
