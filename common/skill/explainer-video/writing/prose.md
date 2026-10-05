# Narration prose

These are some examples a real draft that the user rejected.

## Put the listener inside the situation

An abstract label makes the listener translate it back into the real thing. Describe the real thing directly, in the second person. When you introduce a made-up example, say that it is an example. When only some listeners are in the situation, name that group.

| Bad | Good |
|---|---|
| "Finally, only one run can change a deployment at a time, whether it deploys or destroys." | "Say you run notation deploy, and while it is still running, you run notation destroy on the same app..." |
| "A second problem was slow resources." | "Now, say that database takes a few minutes to start." |
| "When you deploy a Lambda function called orders-api, Notation also..." | "When you deploy a Lambda function – let's call this one orders-api – Notation also..." |
| "On alchemy, the adapter uses..." | "If you run Notation resources on alchemy through the alchemy adapter, the adapter uses..." |

## Start each section with its subject

When a section opens on a word that has no referent yet, the listener cannot attach the rest of the section to anything.

| Bad | Good |
|---|---|
| "Waiting had the same weakness." | "Now, say that database takes a few minutes to start. The old reconciler waited for it by sleeping in memory..." |

## Introduce a term before you refer to it

If the RFC adds the thing, say "a new X". If the thing already exists, say "X, which does Y" the first time you use it.

## Name things again

Pronouns and ordinals lose track of the subject when more than one thing is in play. Repeat the noun.

| Bad | Good |
|---|---|
| "A second one doesn't fail. It waits its turn. If the first one crashed, it keeps its place." | "The destroy command does not fail. It waits until the deploy command is done. If the deploy crashes, the destroy keeps waiting." |
| "one deploy or destroy can work on a deployment" | "you run notation deploy … you run notation destroy" |

## Name who does what

A vague agent hides the mechanism. This includes an operation used as the subject ("a read", "a check"): say which component does the operation.

| Bad | Good |
|---|---|
| "A timer brings the workflow back." | "When the delay ends, Yieldstar's scheduler restarts the workflow, and the reconciler asks AWS again." |
| "Every provider call … becomes a durable step, under a name that never changes." | "Each step has a key built from the resource and the operation, so a later run can find the same step again." |
| "When a read finds a role with no state record..." | "The reconciler first reads the role from AWS. If AWS returns a role, the reconciler checks its tags." |

## Explain; do not list mechanisms

The first draft read like slides. Each line named a mechanism from the RFC, and the listener got no picture of what happens. A summary sentence that is correct but abstract ("X marks where Y goes, and Z decides what it is") and a slogan ("X always wins") have the same problem. Replace them with the concrete steps.

| Bad | Good |
|---|---|
| "A pending provider operation becomes a durable delay. The process can exit, and a timer wakes the workflow later." | "And when AWS says the database is still starting, the reconciler writes a delay into the log, and the process can exit." |
| "State writes commit with the step ledger, and check the store's instance and version." | (Cut. The viewer does not need it to follow the story.) |
| "The fix: the schema marks where a name and ownership tags go, and the engine decides what they are." | "The fix starts in the schema. The role name field gets a new flag: physical name. This flag tells the engine: if the code gives no role name, make one." |
| "A name that you set in code always wins." | "If your code sets a role name, the reconciler uses that name, but does not generate its own one." |

## Give each event a cause

When the story needs something to go wrong, say how it goes wrong.

| Bad | Good |
|---|---|
| "...and its state record is lost." | "Someone deletes the state database, and with it the state record of the role." |

## Keep sentences short

A listener cannot go back and read a sentence again. Break long noun phrases and stacked clauses into separate sentences.

| Bad | Good |
|---|---|
| "If the state record of a role with a generated name is lost, ..." | "Take, for example, a role with a generated name. Someone deletes the state database, and with it the state record of the role." |

## Write for the ear

In text, syntax highlighting and code font show that a word is an identifier. In speech, the listener does not get this help, so an identifier can sound like a normal word. Describe what the identifier does.

| Bad | Good |
|---|---|
| "...uses alchemy's own name function and alchemy's tags." | "...uses alchemy's own function for creating resource names. It also adds the same tags that alchemy adds to its own resources." |

## Make tension explicit

Make clear transitions from problem to solution, or from status quo to change, and ensure the user is aware which you are talking about.

Use a range of explicit conjunctive words when the script is describing a tension. Also join each step in a chain of reasoning with a connective ("In that case, ...", "If ..., then ...", "So, ..."). Do not put the steps next to each other with no link.

Lean into reductio ad absurdum if it helps make the point.

## Land on a contrast

Close with the before and after in plain words: "Before, a crash meant cleanup … Now, a crash is just a pause. Rerun the same execution, and the deploy finishes."
