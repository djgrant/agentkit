---
name: map-reduce
description: Use sub-agents to parallelise work with a diverge-and-converge shape. Requires MDZ skill.
input: $items, $map, $map-worker, $reduce, $reduce-worker?
---

FOR $item IN $items
  SPAWN $map-worker
  WITH
    instruction: $map
    item: $item
END

$results = every sub-agent output, in the same order as $items

IF $reduce-worker
THEN
  RETURN SPAWN $reduce-worker
  WITH
    instruction: $reduce
    results: $results
END

RETURN the result of applying $reduce to $results
