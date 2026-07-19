---
name: ralph
description: Repeat a task with fresh workers. Use for hill-climbing optimisations. Requires MDZ skill.
input: $task, $worker, $max-rounds
---

$round = 0

WHILE $round < $max-rounds
  SPAWN $worker
  WITH
    instruction: $task
  $round = $round + 1
END

RETURN $round
