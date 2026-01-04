# mdq - Agent Instructions

## Overview

mdq is a markdown query tool for managing roadmap/backlog items using filename conventions.

## File Convention

`{priority}-{status}-{slug}.md`

- Priority: p1 (highest) to p4 (lowest)
- Status: pending, in_progress, done, idea, blocked
- Slug: kebab-case identifier

## Common Operations

```bash
# Find ready work
mdq list -s pending --sort=priority

# Mark item as in progress
mdq status <slug> in_progress

# Complete an item
mdq status <slug> done

# Get JSON for processing
mdq list --format=json
```

## Integration

mdq looks for `roadmap/` in the current directory. Structure subdirectories by category:

```
roadmap/
├── bugs/
├── features/
├── research/
└── tooling/
```

## Notes

- No database - pure filesystem operations
- Changes are immediate (file renames)
- Git-friendly - just file renames tracked normally
