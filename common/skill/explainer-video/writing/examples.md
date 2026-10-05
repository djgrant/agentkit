# Script 1

## 01 two-steps

When you run notation deploy, the reconciler handles each resource in two steps. First, it asks a provider, like AWS, to create the resource. Then it records the resource in state: Notation's list of what exists.

## 02 crash-between-steps

Suppose the process crashes between those two steps. AWS now has a new database, but state has no record of it. On the next deploy, the reconciler checks the state store but doesn't find the database we created. Given, as far as it knows, no database exists, it creates a another one.

## 03 lost-timer

Now say the database takes a few minutes to come online. The old reconciler waited for the database to start before marking it as deployed – but it would waiting by setting an in-memory timer. If the reconciler process stopped during that wait, the next deploy would lose the timer, and start over from the beginning.

## 04 durable-log

The fix is to record every step as it happens. Each call to AWS, each write to state, and each wait becomes a step in a durable log, on disk, outside the process. Each step has a key built from the resource and the operation, so a later run can find the same step again.

## 05 resume

Now, after a crash, you rerun with the same execution ID. The new process reads the log. Steps that already finished return their saved results, so AWS is not called twice. Work continues at the first unfinished step.

## 06 durable-delay

And when AWS says the database is still starting, the reconciler writes a delay into the log, and the process can exit. When the delay ends, Yieldstar's scheduler restarts the workflow, and the reconciler asks AWS again.

## 07 concurrent-destroy

Say you run notation deploy, and while it is still running, you run notation destroy on the same app. The destroy does not fail. It waits until the deploy is done. If the deploy crashes, the destroy keeps waiting, so you can resume the deploy and finish it first.

## 08 repeat-safe

One risk remains. AWS can finish a create just before a crash, before the log records it. Then the rerun sends the same create again. So provider operations must be safe to repeat.

## 09 crash-is-pause

Before, a crash meant cleanup: diff state against what really exists in AWS, and reconcile the difference. Now, a crash is just a pause. Rerun the same execution, and the deploy finishes.

# Script 2

## 01 update-in-place

When you run notation deploy, the reconciler compares each resource with its record in state. If a param changed, it asks the provider, for example AWS, to update the resource in place. If nothing changed, it does nothing.

## 02 immutable-params

Each resource has a schema that lists its params. Some params cannot change after the resource exists. Take, for example, an IAM role. You can change the description of a role after you create it, but not its path. So the schema marks the path as immutable.

## 03 silent-path-change

Problem 1. Now, if you change the path of the role, the reconciler compares the old params with the new params. When they are different, the reconciler has only one action: update. The immutable mark is used only to check the types when the code compiles. The reconciler does not read it when it runs. So the reconciler calls UpdateRole, and UpdateRole has no path field. The new path is not sent, the role keeps its old path, and the deploy reports success.

## 04 no-update-operation

Problem 2. Some resources have no update operation. The policy attachment that connects the role to an AWS policy is one of them. If you change which policy it attaches, the reconciler has no operation that can apply the change. So it skips the change and reports success. State keeps the old policy, so every later deploy plans the same update, and skips it again.

## 05 schema-decides

The fix is to let the schema decide which type of change it is. The reconciler compares the old and new params one field at a time, and finds each changed field in the schema. The reconciler replaces the resource if the field is immutable, if the field is a key that identifies the resource, or if the resource has no update operation. Otherwise, the reconciler updates the resource in place.

## 06 delete-then-create

To replace a resource, the reconciler deletes it and then creates it again. It deletes first, because the new role has the same name as the old role, and two roles with one name would collide. Each half is a durable step. If the process crashes, a rerun continues where it stopped. The new record gets a new instance ID, so you can tell the new role from the old one.

## 07 plan-may-replace

The policy attachment gets its role name from the role. When you run a plan, the new role does not exist yet, so the plan cannot know its name. The role name is a key, so the plan shows the attachment as "may force replacement". The plan shows the most that a deploy might do. During the deploy, the reconciler decides again for each resource, after its dependencies are done, with real values. The role name has not changed, so the attachment is not replaced.

## 08 delete-conflict

One problem remains. IAM does not let you delete a role while a policy is attached to it. The reconciler cannot remove the attachment first, because it knows that the attachment needs a change only after the new role exists. So this deploy fails. The RFC leaves this as an open question. One fix is to create the new resource before the reconciler deletes the old one, but that needs generated names.

## 09 shared-decision

Terraform, CloudFormation and Pulumi also use the schema to decide when to replace a resource. In Notation, this decision is a separate function that does not depend on the reconciler. So other engines, such as alchemy, can decide in the same way as the reconciler.

## 10 before-after

Before, a change that could not be made in place was lost, and the deploy still reported success. Now, the schema tells the reconciler which changes need a new resource, and the plan shows you each replacement before you deploy.
