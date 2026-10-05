# Narration prose

These are some examples a real draft that the user rejected.

## Put the listener inside the situation

An abstract label makes the listener translate it back into the real thing. Describe the real thing directly, in the second person.

| Bad | Good |
|---|---|
| "Finally, only one run can change a deployment at a time, whether it deploys or destroys." | "Say you run notation deploy, and while it is still running, you run notation destroy on the same app..." |
| "A second problem was slow resources." | "Now, say that database takes a few minutes to start." |

## Start each section with its subject

When a section opens on a word that has no referent yet, the listener cannot attach the rest of the section to anything.

| Bad | Good |
|---|---|
| "Waiting had the same weakness." | "Now, say that database takes a few minutes to start. The old reconciler waited for it by sleeping in memory..." |

## Name things again

Pronouns and ordinals lose track of the subject when more than one thing is in play. Repeat the noun.

| Bad | Good |
|---|---|
| "A second one doesn't fail. It waits its turn. If the first one crashed, it keeps its place." | "The destroy command does not fail. It waits until the deploy command is done. If the deploy crashes, the destroy keeps waiting." |
| "one deploy or destroy can work on a deployment" | "you run notation deploy … you run notation destroy" |

## Name who does what

A vague agent hides the mechanism.

| Bad | Good |
|---|---|
| "A timer brings the workflow back." | "When the delay ends, Yieldstar's scheduler restarts the workflow, and the reconciler asks AWS again." |
| "Every provider call … becomes a durable step, under a name that never changes." | "Each step has a key built from the resource and the operation, so a later run can find the same step again." |

## Explain; do not list mechanisms

The first draft read like slides. Each line named a mechanism from the RFC, and the listener got no picture of what happens.

| Bad | Good |
|---|---|
| "A pending provider operation becomes a durable delay. The process can exit, and a timer wakes the workflow later." | "And when AWS says the database is still starting, the reconciler writes a delay into the log, and the process can exit." |
| "State writes commit with the step ledger, and check the store's instance and version." | (Cut. The viewer does not need it to follow the story.) |

## Land on a contrast the viewer can repeat

Close with the before and after in plain words: "Before, a crash meant cleanup … Now, a crash is just a pause. Rerun the same execution, and the deploy finishes."
