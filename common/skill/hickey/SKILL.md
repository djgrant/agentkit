---
name: hickey
description: Hill-climbing loop to simplify a target. Use on request only. Requires reading MDZ skill.
input: $target, $explorer?, $worker?, $reviewer?, $max-rounds?
---

$max-rounds = $max-rounds ?? 10
$round = 0

WHILE $round < $max-rounds
  SPAWN $explorer
  WITH #explorer-instructions($target)

  IF $explorer SATISFIED THEN
    BREAK;
  END

  $batches = Array<set of tasks from $explorers that can be efficiently completed by a single agent>

  FOR $batch of $batches
    SPAWN $worker 
    WITH the set of tasks to be completed
  END
    
  SPAWN $critic
  WITH "Review the work in commits #{commits from $batches}" 

  IF $critic reported issues THEN
    SPAWN $worker
    WITH instructions to fix the issues
  END

  $round = $round + 1
END

RETURN final verdict, rounds completed and summary of findings/changes

## Explorer Instructions

## Role

Our aim today is to simplify #{the $target}. 

Your role is to find the highest impact simplification candidates.

### The Task

You will find the highest-impact candidates for simplification. 

You are constrained only to preserve eseential behaviour, not backward compatability.

If the target cannot be simplified, you will short circuit and report SATISFIED. 

You are encourage to think out loud and take ephermeral notes as you go through this process.

### Finding Candidates

Passes:
- A thing is simple when it contains only what its purpose needs, and makes that purpose easy to understand or use. This is distinct from minimalism: many parts are fine, so long as each part is one thing and the seams between them are clear. 

Fails:
- A thing is complex when it braids independent concerns into one thing, or smears one concern across several things. Two names for one concept is a defect; so is one name for two concepts. Look for high-degrees of connascence (name, type, meaning, position, algorithm, execution, timing, value, identity) across boundaries.

### Unpacking the Candidates

When looking at candidates, start by understanding their constraints; then re-derive those constraints from first principles. Ask: "what would the constraints, and thereby the design, be if I was building from this from scratch?". 

Take the perspective of the consumer. Study the interface. This is where most complexity lives. When the structure is sound, the implementation naturally becomes simpler. Ask: "As things stand, can I change one half of this without touching the other?"

### Defining the Solution

The highest leverage work is often negative work, but simplicity doesn't necessarily demand reduction. The solution may be re-invention. It may be the addition of a new element – whether that's a word, a branch, an operator, or a concept.

The test is always whether the addition or reduction better satisfies the simplification criteria.

### Listing Candidates

Now you have found some canidates, write them down in order of impact. Rank candidates regardless of how much work it will be to implement it.
