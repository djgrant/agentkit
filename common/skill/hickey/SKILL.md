---
name: hickey
description: Simplify a target until an adversarial Rich Hickey critic signs off. Ralph with a judge; expensive. Requires MDZ skill.
input: $target, $worker, $critic, $max-rounds?
---

$max-rounds = $max-rounds ?? 10
$round = 0
$verdict = ""
$findings = ""

WHILE $round < $max-rounds AND $verdict != "SATISFIED"
  SPAWN $worker
  WITH
    instruction: #worker-instructions
    target: $target
    findings: $findings
  SPAWN $critic
  WITH
    instruction: #critic-instructions
    target: $target
  $verdict = the critic's verdict
  $findings = the critic's required changes, in priority order
  $round = $round + 1
END

RETURN { verdict: $verdict, rounds: $round, findings: $findings }

## Principles

1. Simplicity is the absence of unnecessary complexity. A thing is simple when it contains only what its purpose needs, and makes that purpose easy to understand or use. That is not minimalism: many parts are fine, so long as each part is one thing and the seams between them are clear.
2. Complexity is complecting — braiding independent concerns into one thing, or smearing one concern across several. Give each concept one name, one home, and the plainest exact word the domain already has. Two names for one concept is a defect; so is one name for two concepts, or a name that needs a comment to explain its relation to a neighbour.
3. Every element must earn its place today: each part of each name and persisted string, each clause of each comment, each sentence of each doc. Comments and docs state what is and what binds — never history, never what the code does not do, never a defence against an alternative nobody proposed.
4. The primary way to reduce something is to better understanding the required guarantees and constraints. Re-derive every inherited constraint from first principles – do not automatically trust previous claims. Ask who or what depends on this today, and whether it has actually shipped. A constraint with no dependent is not a constraint, and honouring one anyway is complexity.

## Worker instructions

Simplify the target by [the principles](#principles). You are one fresh round in a loop, judged by an independent critic between rounds; build on the committed state you find and leave committed, verified state behind.

If you were given findings, they are the critic's required changes from the last round. Verify each claim yourself before acting on it, and report any that don't hold, with evidence. If findings are empty, survey the whole target yourself, reading it as a newcomer would — for a branch, the full diff against its base and then the changed files whole, since diffs hide what earlier rounds left alone.

Preserve behaviour except where a finding deliberately changes it. Keep the tests and typecheck green, apply renames everywhere at once — code, tests, docs, persisted-identifier maps — and commit. Report what you changed in terms of the principles, and every inherited constraint you re-derived.

## Critic instructions

Hold the target to [the principles](#principles). You review only: no edits, no commits, no new files.

Read the target whole, as a newcomer would. Verify claims against reality — run the tests, check registries and dependents, read the upstream source a wrapper wraps — and be concrete: cite files, identifiers, and strings. Issues that pre-date the target don't block; note them separately. Hold the bar exactly where Hickey would: don't pass work because it is close, and don't invent objections — if what remains is genuinely simple, say so. Separate blocking defects from non-blocking nits.

End your report with exactly one verdict line: `VERDICT: SATISFIED` only if you would sign the target off as simple, otherwise `VERDICT: NOT SATISFIED` followed by the required changes in priority order.
