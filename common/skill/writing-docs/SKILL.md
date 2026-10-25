---
name: writing-docs
description: How to write documentation pages. Use when writing or editing docs, guides, READMEs, or reference pages.
---

# Writing docs

## Approach

Build up the mental model from knowledge shared between you and the reader, and then layer the explanation inductively, brick-by-brick. Use lists, tables, and examples to make pages more quickly parseable and to avoid walls of text.

### Own the narrative

Make sure you understand the underlying source material, check every example is realistic, and that claims check out.

But do not rely on the narrative you find in the source material. Your job is to understand and then explain. It is not enough to simply relay the source material.

### Introduce concepts first

Make sure that the reader knows what you're talking about before you rely on a term, object or concept to explain something else.

### Explain progressively

What is important is that the reader _gets_ the concept. Explaining something in complete detail misses the point and bores the reader. Meanwhile, reducing something to a slogan or summary has no teaching value. Explain concepts brick by brick until a mental model has been constructed.

### Leave things out

Keep information that the reader needs to follow along.

## Grounding

Explain by referencing the underlying material facts; show your working whether that is data, lines of code, or a quote. Never narrate the evidence. Do not explain what can just be a code sample; and do not describe process when a declaration of disregarded/preferred states can be expressed.

### Dispassionate tone

Every sentence should trace to a concrete fact. If it could appear in a press release, delete it.

No marketing language. No high-level claims. State facts. Describe what was done and why. Let the reader draw their own conclusions.

### Realistic examples

Use examples to hang the explanation off. Use the same example throughout.

### Concrete descriptions

Don't describe something in the abstract, describe the real thing directly.

### Orientation

Include references to types, short code snippets (pseudo code is allowed), references to packages files etc for the purposes of properly orientating the reader.

## Code

### Show, then talk

Draft the code or diagram with the sentence that needs it. If the page turns on the shape of an API, show the real code, and let the prose point at it ("the input has no path field") instead of reading it out.

### Curate the code

Never paste a 200-line diff when 10 lines contain the logic. Show the essence, not the changeset.

### Allow whitespace

3 sentences next to 40 lines of code is fine. White space beats filler prose.

## Sections

Each section type serves a specific function.

### Prose

**Use:** Background, problem statements, transitions.

> "The authentication layer processed tokens on every request. As traffic grew, this became the primary latency bottleneck."

### Code

Use short code blocks that get the conceptual model across. Use short comments with arrows to point out the load-bearing/surprising bits. 

Follow code with comments that point out what was interesting, rather than put (boring) descriptions of what the code does before the code.

### Conceptual tension

**Use:** Old model left, new model right. Let the layout teach.

| Old Model: Verify on every request | New Model: Session cache with TTL |
|-----------------------------------|----------------------------------|
| JWT decoded per request | Decoded once, cached in Redis |
| 100ms latency at p99 | 4ms latency at p99 |
| No cache invalidation path | Revocation via cache key delete |

### Diagram

**Use:** Data flow, architecture, type hierarchies. One concept per diagram.

### No filler headings

| ❌ No | ✅ Yes |
|-------|--------|
| "Building the Platform: Architecture Decisions" | "Stream Data Model" |

### Start with the subject

Bring dominant subjects to the start of explanations. Do not treat verbs as subjects.

### Signpost

"As an aside...", "For example...", "Problem 1: ...", "For users of the X package...."

### Signpost critical elements

Any fact, statement, or conclusion on which the argument turns or relies on should be highlighted. Don't just say the thing. Say it, and then say that it is important and why.

## Sentences

Be concise, but this does not mean using language so economically that the reader is presented with terse sentences that are difficult to parse. It means that you identify the most important and salient ground truths, and surface them with clear explanations.

### Keep referring to the noun

Replace nouns with a pronoun or ordinals judiciously. It's ok to repeat the noun to make sure the reader doesn't lose track of the subject which is in play.

### Name who does what

Be explicit about who is the actor/agent.

### No zombie nouns

Don't nominalize verbs or use passive voice.

| ❌ No | ✅ Yes |
|-------|--------|
| "The utilization of a Kubernetes-based solution facilitated the amelioration of scalability issues." | "We used Kubernetes to scale." |
| "Implementation of the lock was performed to ensure safety." | "We added a lock." |

### Use conjunctive words

Avoid leaning too heavily on paratactic or staccato writing. Use conjunctive words to make tensions and connections explicit.

| ❌ No | ✅ Yes |
|-------|--------|
| "The API is minimal. The complexity lives in the domain layer." | "Complexity lives in the domain layer, so we designed the API as a thin wrapper around it." |

### Substantiate callbacks

When making a callback to a previous section, make sure to remind the reader the substance of what you are referring back to.

### No buzzword salad

Instead, ground every clause in something the reader can picture.
