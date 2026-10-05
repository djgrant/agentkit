# Narration prose

At a high-level, write an engaging story that flows and is easy to follow along.

Here are some tips to help you write for the human viewer.

## Put the listener inside the situation

Don't describe something in the abstract, describe the real thing directly. 

When you introduce a made-up example, say that it is an example. 

And when an element only applies to a certain group, name that group.

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

Replace nouns with a pronoun or ordinals judicously. It's ok to repeat the noun to make sure the viewer doesn't lose track of the subject which is in play. 

| Bad | Good |
|---|---|
| "A second one doesn't fail. It waits its turn. If the first one crashed, it keeps its place." | "The destroy command does not fail. It waits until the deploy command is done. If the deploy crashes, the destroy keeps waiting." |
| "one deploy or destroy can work on a deployment" | "you run notation deploy … you run notation destroy" |

## Name who does what

Be explicit about who is the actor/agent.

| Bad | Good |
|---|---|
| "A timer brings the workflow back." | "When the delay ends, Yieldstar's scheduler restarts the workflow, and the reconciler asks AWS again." |
| "Every provider call … becomes a durable step, under a name that never changes." | "Each step has a key built from the resource and the operation, so a later run can find the same step again." |
| "When a read finds a role with no state record..." | "The reconciler first reads the role from AWS. If AWS returns a role, the reconciler checks its tags." |

## Avoid slogans; explain progresively

What is important is that the user _gets_ the concept. Explain something in full detail loses the viewer; reducing something to a slogan or summary has no teaching value. Explain concepts brick by brick building until a mental model has been constructed. 

| Bad | Good |
|---|---|
| "The fix: the schema marks where a name and ownership tags go, and the engine decides what they are." | "The fix starts in the schema. A new flag, "physical name", is assinged to the role name field. This flag tells the engine: if a role name is no provided, generate one." |
| "A name that you set in code always wins." | "If your code sets a role name, the reconciler will use that name instead of generating one of its own one." |

## Lean into reductio ad absurdum 

When the story needs something to go wrong, say how it goes wrong.

| Bad | Good |
|---|---|
| "...and its state record is lost." | "Someone deletes the state database, and with it the state record of the role." |

## Keep sentences short

A listener cannot go back and read a sentence again. Break up long noun phrases and stacked clauses.

| Bad | Good |
|---|---|
| "If the state record of a role with a generated name is lost, ..." | "Take, for example, a role with a generated name. Someone deletes the state database, and with it the state record of the role." |

## Write for the ear

In text, syntax highlighting tells the reader that something is an identifier. In speech, we need to use verbal punctuation.

| Bad | Good |
|---|---|
| "...uses alchemy's own name function and alchemy's tags." | "...uses alchemy's own function for creating resource names. It also adds the same tags that alchemy adds to its own resources." |

## Say the role, show the name

Long identifiers are hard to follow when spoken. Say what the thing is, and put its name in a footnote. The frame shows the name when the voice gets to the marker. Spell out the name the first time only if the name itself is the subject; if its structure is the point, say its parts.

| Bad | Good |
|---|---|
| "So the role name will be something like prod-orders-api-role-7f3a." | "So the role name[^1] will start with the deployment name, then the resource ID, then part of the instance ID." `[^1]: prod-orders-api-role-7f3a` |
| "...a new role name: for example prod-orders-api-role-9b04." | "...a new role name[^2]." `[^2]: prod-orders-api-role-9b04` |

## Use tense to separate what exists from what will exist

Use the present tense for the status quo, and the future tense for what is being proposed. If the problem and the fix both use the present tense, the listener cannot tell which one you are talking about.

| Bad | Good |
|---|---|
| "The role name field gets a new flag: physical name." | "The role name field will be given a new flag, called physical name." |

## Substantiate callbacks

When making a callback to a previous section, make sure to remind the user the substance of what you are referring to.


| Bad | Good |
|---|---|
| "Now go back to problem 1." | "Let's return to problem 1 – that to change the path, the reconciler had to delete the old role before it created the new role. |

## Make tension explicit

Make clear transitions from problem to solution, or from status quo to change, and ensure the user is aware which you are talking about.

Use a range of explicit conjunctive words to express tension or join steps within a causal chain.
