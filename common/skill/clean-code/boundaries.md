# Clean Code: Boundaries

## Rule 1: Call each thing by its right name

Identify unamed patterns, higher-order functions, and interfaces hidden in the codebase. At the most fundamental level, what is it? A reactive paradigm? Isomorphism? Principle of least power?

Can those named patterns now be lifted into a package, a utility set, an interface, or even a seperate repository. If not, should the named thing be surface in the code, comments and documentation?

## Rule 2: Put everything in its proper place

You are like a librarian. You don't sort books by their height or colour; you organise them so that they can be easily found by curious visitors. The file path is a route map.

There is an art to deciding how to group each entity because entities do not naturally organise into a tree; rather they form a graph of cross cutting concerns.

Breaking up code in to files and folders helps avoid having one location for multiple concepts.  Conversely, grouping entities helps avoid having multiple locations for the same concept.

## Tactic 1: Identify sub systems

If the codebase contains multiple sub-systems, seperate them out the outset.

## Tactic 2: Classify the units of computation

Within a domain, what are all same kinds of operations that are performed? 

| domain 1 | kind 1 | kind 2 | kind 3 |
| domain 2 | kind 1 | kind 2 | kind 3 |
| domain 3 | kind 1 | kind 2 | kind 3 |

Those columns are the blueprint for a package (read ./contracts.md if you encounter this):

| pattern 1 |
| kind 1 |
| kind 2 |
| kind 3 |

## Tactic 3: Design the file map 

The architecture of the app should be comprehensible from `tree -L 3 --gitignore`.

Invaraints: 
1. Each folder (level in a file path) should contain a set of same-kind entities e.g. grouped by domain, type, role, capabilities – never a mix
2. Each tier within a file path should have a kind that contibutes to the classification of the leaf file e.g. 
  - `capability -> domain -> feature` :: `workflows/checkout/create-purchase-intent.ts`
  - `surface -> domain -> type`       :: `cli/reporter/renderer.ts`
  - `type -> domain -> type`          :: `reporter/cli/renderer.ts`
3. For general categorisation, use folder names like src, lib, types, utils, exports, features, services and domains

## Example file trees

#### Example 1 (`category -> feature`)

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

The categorisation helps the visitor to form a rough dependency graph and find the contractual "front door". There was no need to go another level deep because each module contains sets of similar entities. An extra level might be necessary if, for example, config could also be grouped by domain.

#### Example 2 (`category -> domain -> domain.type`)

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

The fact that each domain follows a conventional pattern is reflected in the file path. Filenames are namespaced to avoid dozens of files with the same name. Some modules may be small but each module has a clear purpose and space to grow more complex logic.

#### Example 3 (`surface -> category -> domain -> domain`) 

This is a example of poor structure. The lack of a type kind in the path makes it particularly difficult to reason about the architecture of this program. A domain should not be nested in a lib folder. The result is junk drawer of modules.

```
cli/lib
├── catalysts
│  ├── announcements.ts
│  ├── attempts.ts
│  ├── dividends.ts
│  ├── earnings.ts
│  ├── event.ts
│  ├── rns.ts
│  ├── seit.ts
│  └── types.ts
```

## Tactic 4: Co-locate code that rhymes

The coherence of the file tree has to follow all the way into the file contents. It is not enough to have a pretty file tree and the fill the files with junk. A module should have a theme – each block takes a similar shape. Modules that do lots of different looking things are harder to parse.

The purpose of each module should be comprehensible from its signature. Same kind modules, should have the same signature.

## Tactic 5: Ensure procedural code tells a story

Programs should run top to bottom to tell a clear story. Never just arbitarily split a large function into smaller function – a function where you have to jump up and down to follow the control flow obscures the intent of the program.

There should be no comments narrating how the program works – that should be self-evident from the code.
