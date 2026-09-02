---
name: simple
description: >-
  Explain a topic, problem, solution, or ticket in the simplest possible terms:
  short, plain language, no jargon, no walls of text. Manually invoked as
  `/cdx:simple <topic>`, `/cdx:simple explain the problem`,
  `/cdx:simple explain the solution`, or `/cdx:simple ticket 1234`. With no
  argument, explain whatever the conversation is currently about. Starts with
  the gist and offers more detail one level at a time.
user-invocable: true
---

# Simple explanation

Goal: the reader understands in under a minute, without re-reading. Write as if
explaining to a smart colleague who has zero context and is short on time.

This skill exists because default answers are too long and assume too much.
Length and precision are not the same thing: a short explanation that lands is
worth more than a complete one that gets skimmed.

## Figure out the subject

Start from what is already in the conversation: the discussion, recent tool
output, files already read. That is usually enough, and it keeps the answer
fast and grounded in what the user was just looking at.

Reach for tools when context is missing or thin, not as a first step:

- **A ticket or issue reference** (`#123`, `ticket 123`, a URL): if it was
  discussed, use that. Otherwise fetch it with whatever is available
  (`gh issue view`, a tracker MCP, WebFetch). If nothing can reach it, say so
  in one line and ask the user to paste it.
- **"the problem" / "the solution" / "this" / no argument**: use the current
  discussion. The subject is whatever was most recently under discussion.
- **A concept, file, or piece of code named in the argument**: if it has not
  come up, read the file or grep for it. Read only what is needed to explain
  it, not to audit it.

Tool use is for gathering the subject, not for padding the answer: the output
stays just as short regardless of how much you had to read.

## Three levels, one at a time

Give level 1 only, then end with a single-line offer of the next level. Never
dump all levels at once: the whole point is that the reader controls how deep
they go.

**Level 1: the gist** (default, roughly 60 to 120 words)

1. One sentence: what it is.
2. One sentence: why it matters, or what breaks.
3. Up to 3 short bullets with the key points.
4. Optional one-line analogy, only if it genuinely helps.

End with: `Want a bit more detail?`

**Level 2: a bit more** (on request, roughly 150 to 250 words)

Same plain language. Add the how: the mechanism, the cause chain, the main
trade-off. Short bullets or two to three short paragraphs. Still no headers.
Still no jargon without an inline explanation.

End with: `Want the full explanation?`

**Level 3: the full picture** (on request)

Complete and precise: edge cases, alternatives considered, exact files,
functions, or commands where relevant. Code blocks allowed. Still written for
clarity, length as needed, no padding. No offer at the end.

Each level stands on its own and builds on the previous one. Do not repeat what
was already said. If the user says "more", "go on", or "yes", move to the next
level. If they ask a specific question instead, answer it at the current level
of simplicity and offer the next level again.

## Style rules and why

- **Short words, short sentences.** Every extra clause is another thing the
  reader has to hold in their head.
- **Name a concept only if the reader must know it**, and explain it in the
  same sentence. Unexplained terms are where readers stop reading.
- **Concrete beats abstract.** "The request times out after 30 seconds" beats
  "there is a latency issue".
- **No preamble** ("Sure, here's a simple explanation"), **no recap, no offer
  of follow-up** beyond the single next-level line. They add length and no
  understanding.
- **No headers at levels 1 and 2, no code blocks unless the code is the
  subject** (then five lines or fewer). Formatting is structure, and the gist
  should not need structure.
- **If you had to guess** at what the user meant or fill a gap in context, say
  so in one clause rather than presenting the guess as fact.

## Example

Argument: `explain the problem` after a debugging session about a flaky
integration test.

> The test fails about one run in five because two tests write to the same
> temp file at the same time. When they overlap, one reads the other's
> half-written data and the assertion fails.
>
> - It only happens when tests run in parallel, which is why it passes locally.
> - The file name is hard-coded, so there is no isolation between tests.
> - Fix is to give each test its own temp directory.
>
> Want a bit more detail?
