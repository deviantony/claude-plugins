---
name: html-report
description: >-
  Turn a discussion, proposal, investigation, or set of findings into a polished,
  self-contained HTML report in the Portainer house style (the look of
  docs/local/advanced-auth.html — DM Sans, the Portainer design-system palette,
  verdict bands, comparison tables, pros/cons cards, severity findings, CSS
  diagrams). Invoke this manually when you want a presented HTML document — a design
  doc, proposal, assessment, or write-up of findings — that is easier to review or
  share than a markdown dump or chat scrollback.
user-invocable: true
---

# Portainer HTML report

Produce a single self-contained `.html` file styling a discussion or set of
findings in the Portainer house style. The output is one file — inline CSS, no
JavaScript, no build step, no image assets (diagrams are pure CSS). The only
external reference is the DM Sans webfont, which degrades gracefully offline.

This style exists because reviewing a proposal in a well-presented document beats
reviewing it as chat scrollback — the structure (verdict up top, numbered
sections, comparison tables, severity-tagged findings) does the reader's
organizing for them. Match it; don't reinvent it.

## The template is the source of truth

`${CLAUDE_PLUGIN_ROOT}/skills/html-report/assets/report-template.html` is a
self-contained kitchen-sink document: the full palette plus every component, each
demonstrated once and labelled with an HTML comment. **Always start from it.**
Copy it to the output path, then replace the `<main>` content with the real
material, deleting the component demos you don't need.

Do not regenerate the CSS from memory and do not hand-tweak colors, fonts, or
spacing — the whole value is that every report looks like it came from the same
hand. The `:root` tokens are the Portainer design system; leave them alone.

`${CLAUDE_PLUGIN_ROOT}/skills/html-report/references/components.md` is the index
of what each component is *for* — read it when you're unsure which component fits
the material in front of you.

## Two ways in

### A. The conversation already has the material

The user has been working with you — an investigation, a comparison, a design
debate, a code review — and now wants it written up. The substance exists in the
scrollback; your job is to select and present it, not to re-derive it.

A long conversation usually contains more than one report's worth of material, and
only the user knows which slice they want to hand to whoever reviews it. So before
writing, **use `AskUserQuestion` to scope it** — a few quick choices beat guessing
and rewriting. Good things to pin down:

- **Focus** — which thread of the discussion is this report about? (Offer the
  distinct topics you can see in the conversation as options.)
- **Audience / depth** — a tight proposal for a decision-maker, or a thorough
  technical assessment with all the findings?
- **Shape** — what's the spine? A recommendation (verdict + rec list), a
  comparison (table + pros/cons), an assessment (findings by severity), or a
  design walkthrough (sections + diagrams)?

Skip the questions only when the user has already been explicit ("write up just
the auth comparison as a short proposal"). When they have, honor it and go.

### B. Fresh conversation — you did the work, now present it

The user points you at something (a PR, a subsystem, a question) and wants the
report as the deliverable. Do the investigation first, then turn your findings
into the document. Here you're the author of the substance, so don't interrogate
the user about content they haven't seen yet — make sensible structural choices
from what you found and present a complete first draft they can react to. One
clarifying question is fine if genuine ambiguity blocks you (scope, audience);
more than that stalls a flow whose whole point is "go produce the artifact."

## Building the report

1. **Decide the spine** from the material (see
   `${CLAUDE_PLUGIN_ROOT}/skills/html-report/references/components.md`). Most
   reports open with a masthead, optionally a verdict band, then numbered
   sections, and close with a footnote. Let the content pick the components —
   a comparison wants a table and pros/cons cards; a review wants findings; a
   design wants sections and a diagram or two.
2. **Lead with the conclusion.** If there's a bottom line, put it in a verdict
   band near the top. Reviewers should get the answer before the argument.
3. **Write real prose, not filler.** The components frame the content; they don't
   substitute for it. Each section's prose should make its point in the first
   sentence. Inline `<code>` for identifiers, env vars, and paths.
4. **Add a diagram when a flow or topology is easier shown than told** — a request
   path, a layer stack, a before/after. Use the CSS `.diagram` boxes; don't pull
   in mermaid or images (that would break the single-file property). If the thing
   is genuinely graph-shaped, prose plus a small table beats forcing boxes.
5. **Close with a footnote** stating what the document is (a proposal, not a
   committed plan) and the sources it's built from — code paths, PRs, other docs.
   This is what lets someone who wasn't in the room trust it.
6. **Escape user content** going into HTML — `<`, `>`, `&` in code snippets and
   quoted strings (`&lt;`, `&gt;`, `&amp;`), or it renders wrong or breaks layout.

## Where to write it

Save to `docs/local/` if that directory exists (the established home for these in
the portainer-mcp repo); otherwise write to the current working directory. Name
the file from the topic in kebab-case (e.g. `oidc-assessment.html`). Tell the user
the exact path when you're done, and — since these are made to be looked at —
offer to open it in a browser.

## After the draft

These reports are most useful as a starting point the user reacts to. After
writing, give a one-line summary of the structure you chose (sections + key
components) so they can redirect quickly — "made it a comparison: verdict band,
an axes table, pros/cons cards, and a 5-step recommendation." Then it's easy for
them to say "drop the table" or "add a diagram of the request flow" and you adjust
the one file.
