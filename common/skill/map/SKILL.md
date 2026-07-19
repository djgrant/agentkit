---
name: map
description: Use sub-agents to parallelise work that transforms a set of inputs. Requires MDZ skill.
input: $items, $map, $map-worker
---

FOR $item IN $items
  SPAWN $map-worker
  WITH
    instruction: $map
    item: $item
END

$results = every sub-agent output, in the same order as $items

RETURN $results
