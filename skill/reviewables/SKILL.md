---
name: reviewables
description: How to write a reviewable post that distills plans, changesets and proposals for easy consumption by the user.
---

# How to Write a Reviewable

A reviewable is a post that distills plans, changesets and proposals for easy consumption by the user.

---

## 1. Narrative Model

Identify a problem or proposition, and build – brick by brick - a conceptual model of the change, providing salient code examples to guide the reader to an understanding of a solution.

You are required to be concise but this does not mean using language so economically that the reader is presented with terse sentences that are difficult to parse. It means that you identify the most important and salient ground truths, and surface them clear explanations. Include references to types, short code snippets (pseudo code is allowed), references to packages files etc for the purposes of properly orientating the user. 

---

## 2. The Narrative Arc

Start by stating the problem/opportunity-solution sets. 

```md
**Problem**
The write handler had no concurrency control. Under load, concurrent requests caused silent data corruption.

**Approach**
We introduced a per-resource advisory lock to serialize writes.

**Result**
Data corruption dropped to zero. Lock overhead is single-digit milliseconds.
```

Opportunity-driven sets follow the same arc, but the opening frame is possibility rather than pain.

```md
**Opportunity**
Tool calls already carry structured metadata. We can use that metadata to auto-generate typed client stubs at build time.

**Approach**
A codegen step reads the tool schema and emits TypeScript interfaces and a thin fetch wrapper for each tool.

**Result**
Consumers get compile-time type safety and autocomplete without writing boilerplate. The generated client is ~40 lines per tool.
```

---

## 3. Section Types

Four section types. Each serves a specific function in the arc.

### Prose

**Use:** Background, problem statements, transitions.

> "The authentication layer processed tokens on every request. As traffic grew, this became the primary latency bottleneck."

### Conceptual Tension

**Use:** Old model left, new model right. Let the layout teach.

| Old Model: Verify on every request | New Model: Session cache with TTL |
|-----------------------------------|----------------------------------|
| JWT decoded per request | Decoded once, cached in Redis |
| 100ms latency at p99 | 4ms latency at p99 |
| No cache invalidation path | Revocation via cache key delete |

### Split-Stream

**Use:** Prose left, code right. Hover either side to illuminate the other.

We acquire an advisory lock keyed by resource ID before entering the write path. **Concurrent writers block** rather than interleave.

```javascript
await db.advisoryLock(
  resourceId
);

await db.write(payload);

await db.advisoryUnlock(
  resourceId
);
```

### Diagram

**Use:** Data flow, architecture, type hierarchies. One concept per diagram.

---

## 4. Tone and Constraints

### Character limit

State the problem and context. If you need more space, you haven't identified the core problem yet.

### Tone: Dispassionate

No marketing language. No high-level claims. State facts. Describe what was done and why. Let the reader draw their own conclusions.

### Grounding: Facts over assertions

Every sentence should trace to a concrete decision, a measurable outcome, or a specific code change. If it could appear in a press release, delete it.

---

## 5. Style Rules

### No zombie nouns

Don't nominalize verbs or use passive voice.

| ❌ No | ✅ Yes |
|-------|--------|
| "The utilization of a Kubernetes-based solution facilitated the amelioration of scalability issues." | "We used Kubernetes to scale." |
| "Implementation of the lock was performed to ensure safety." | "We added a lock." |

### Curate the diff

Never paste a 200-line diff when 10 lines contain the logic. Show the essence, not the changeset.

### Allow whitespace gaps

3 sentences next to 40 lines of code is fine. White space beats filler prose.

### No filler headings

| ❌ No | ✅ Yes |
|-------|--------|
| "Building the Platform: Architecture Decisions" | "Stream Data Model" |

### Use conjunctive words

Avoid leaning too heavily on paratactic or staccato writing. Use conjunctive words to make tensions and connections explicit.

| ❌ No | ✅ Yes |
|-------|--------|
| "The API is minimal. The complexity lives in the domain layer." | "Complexity lives in the domain layer, so we designed the API as a thin wrapper around it." |

### No buzzword salad

Take this AI-generated sentence:
"Git diffs identify line additions, but they obscure semantic topological changes in the document hierarchy. If a requirement document no longer references a domain type, it is invisibly orphaned."

Let's break down why this is awful:
- "Git diffs identify line additions" – so obvious doesn't need to be stated. does thing to ground the problem space.
- "but they obscure semantic topological changes in the document hierarchy" – buzzword salad with little to no salience 
- "If a requirement document no longer references a domain type" – gives the reader jetlag by jumping between concepts without grounding to anything
- "it is invisibly orphaned" – should be the punchline, but is abstract and detatched from any realworld pain

Instead, ground every clause in something the reader can picture:

> Problem: When a requirement stops referencing a domain type — say `OrderItem` is removed from the billing spec — nothing warns you. 
> Approach: We could walk each spec file at build-time, collect every type reference, and flag any type that no spec still points to.
> Result: Orphaned types could be flagged or fail the build. A rename like `OrderItem` → `LineItem` would surface stale specs before they reach main.

---

## 6. Before You Publish

- **Arc:** Did you state the problem/opportunity before the solution?
- **Tone:** Would any sentence work in a marketing email? If yes, rewrite it.
- **Orientation:** Have you pin-pointed changes against the codebase? Have you identified the key limbs changes depend on?
- **Grounding:** Are claims and proposals traced to a code change or a measured outcome? 
- **Examples:** Have your provided examples that ground the change or proposal in a real world context?
- **Code:** Are diffs curated? Are prose sentences linked to the relevant code lines?
- **Length:** Is the opening under 280 characters? Are paragraphs under 4 sentences?
