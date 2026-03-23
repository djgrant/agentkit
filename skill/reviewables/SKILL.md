# How to Write a Reviewable

A reviewable is a post that documents a decision, not an implementation. The reader should finish understanding why a change was made — not just what changed.

---

## 1. Narrative Model

Identify a problem, build – brick by brick - a conceptual model of the change, providing salient code examples to prove the work. The reader goes from ignorance of a problem to understanding of a solution.

No feature dumps. No full-file diffs. No flowery language. State the problem, explain the approach, show the evidence.

---

## 2. The Narrative Arc

Break your release into problem-solution sets. For each set:

| Step | Description |
|------|-------------|
| **Problem** | "The write handler had no concurrency control. Under load, concurrent requests caused silent data corruption." |
| **Approach** | "We introduced a per-resource advisory lock to serialize writes." |
| **Evidence** | "Show the curated code or diff. Link prose sentences to specific code lines." |
| **Result** | "Data corruption dropped to zero. Lock overhead is single-digit milliseconds." |

---

## 3. Section Types

Four section types. Each serves a specific function in the arc.

### Prose

**Use:** Background, problem statements, transitions. Capped at 280 characters.

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

### Character limit: 280 characters

Opening prose is capped. State the problem and context. Cut everything else. If you need more space, you haven't identified the core problem yet.

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

---

## 6. Before You Publish

- **Arc:** Did you state the problem before the solution?
- **Tone:** Would any sentence work in a marketing email? If yes, rewrite it.
- **Grounding:** Can every claim be traced to a code change or a measured outcome?
- **Code:** Are diffs curated? Are prose sentences linked to the relevant code lines?
- **Length:** Is the opening under 280 characters? Are paragraphs under 4 sentences?
