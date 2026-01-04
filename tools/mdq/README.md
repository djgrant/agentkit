# mdq - Markdown Query Tool

A lightweight CLI for querying and managing markdown files using filename-based metadata.

## Convention

Files follow the pattern: `{priority}-{status}-{slug}.md`

- **Priority**: p1, p2, p3, p4 (p1 = highest)
- **Status**: pending, in_progress, done, idea, blocked
- **Slug**: kebab-case description

Example: `p1-pending-fix-authentication.md`

## Usage

```bash
# List all items
mdq list

# Filter by priority
mdq list -p1

# Filter by status
mdq list -s pending

# Filter by category (directory)
mdq list -c tooling

# Combine filters
mdq list -p1 -s pending

# Output formats
mdq list --format=table   # default
mdq list --format=json    # for scripting
mdq list --format=paths   # just file paths

# Sort options
mdq list --sort=priority  # default
mdq list --sort=status
mdq list --sort=name

# Change status (renames file)
mdq status my-item in_progress

# Change priority (renames file)
mdq priority my-item 1
```

## Directory Structure

mdq looks for a `roadmap/` directory in the current working directory. Subdirectories become categories:

```
roadmap/
├── exploration/
│   └── p1-pending-macro-system.md
├── issues/
│   └── p2-done-fix-typo.md
└── tooling/
    └── p1-idea-new-feature.md
```

## Installation

Requires [Bun](https://bun.sh/).

```bash
# Run directly
bun tools/mdq/mdq.ts list

# Or add alias
alias mdq="bun /path/to/tools/mdq/mdq.ts"
```

## Performance

Designed for roadmap-scale usage (< 10k items). Performance at scale:
- 10 items: <2ms
- 1,000 items: <5ms
- 10,000 items: ~10ms
- 100,000 items: ~250ms
