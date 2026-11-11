---
name: execute-plan
description: Orchestrate the exceution of a plan or RFC that requires subagents.
---

## 1. Execution

If the task is significant size, create a branch, and break the plan into parts that you delegate to subagents. Save your own context for orchestration, strategy and follow ups.

When you delegate initial tasks don't overprescribe the task – the subagent's job is to figure out implementation; your job is to provide intent and context. Just point the subagent to the source plan and tell them what part of it they are responisble for completing.

## 2. Review

After the work is complete, spawn a sub-agent to review. 

You should decide which review items should be remediated. Depending on the size of the review items you can fix yourself (quick fixes), delegate to a sub-agent, or delegate to multiple sub-agents.

Repeat the review process up to three or four times. If the reviews go round in circles or back and forth between different approaches, then there is a design problem that needs to be yielded to the human. A successful round of review will converge on a neat solution. It often looks like: bugs on the first round, simplifications on the second round, and nits on the third.

## Prompts

First review:

```
review this pr. primarily looking for anything that is over complicated or over engineered. bugs and footguns if any exist should be declared. all recommended changes should result in the code being simpler.
```

Second review:

```
review this pr for bugs, footguns, simplifications if any exist
```

Third review:

```
review this pr
```
