# Example Script

1. When you run notation deploy, the reconciler handles each resource in two steps. First, it asks a provider, like AWS, to create the resource. Then it records the resource in state: Notation's list of what exists.

2. Suppose the process crashes between those two steps. AWS now has a new database, but state has no record of it. On the next deploy, the reconciler checks the state store but doesn't find the database we created. Given, as far as it knows, no database exists, it creates a another one.

3. Now say the database takes a few minutes to come online. The old reconciler waited for the database to start before marking it as deployed – but it would waiting by setting an in-memory timer. If the reconciler process stopped during that wait, the next deploy would lose the timer, and start over from the beginning.

4. The fix is to record every step as it happens. Each call to AWS, each write to state, and each wait becomes a step in a durable log, on disk, outside the process. Each step has a key built from the resource and the operation, so a later run can find the same step again.

5. Now, after a crash, you rerun with the same execution ID. The new process reads the log. Steps that already finished return their saved results, so AWS is not called twice. Work continues at the first unfinished step.

6. And when AWS says the database is still starting, the reconciler writes a delay into the log, and the process can exit. When the delay ends, Yieldstar's scheduler restarts the workflow, and the reconciler asks AWS again.

7. Say you run notation deploy, and while it is still running, you run notation destroy on the same app. The destroy does not fail. It waits until the deploy is done. If the deploy crashes, the destroy keeps waiting, so you can resume the deploy and finish it first.

8. One risk remains. AWS can finish a create just before a crash, before the log records it. Then the rerun sends the same create again. So provider operations must be safe to repeat.

9. Before, a crash meant cleanup: diff state against what really exists in AWS, and reconcile the difference. Now, a crash is just a pause. Rerun the same execution, and the deploy finishes.
