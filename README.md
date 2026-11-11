# claude-plugins

A Claude Code plugin marketplace (`deviantony-plugins`).

## Marketplace setup

All commands below are slash commands typed inside Claude Code.

### Add the marketplace

```
/plugin marketplace add deviantony/claude-plugins
```

### Manage plugins

| Action | Command |
|---|---|
| Install a plugin | `/plugin install <name>@deviantony-plugins` |
| Upgrade installed plugins to the latest version | `/plugin marketplace update deviantony-plugins` |
| Uninstall a plugin | `/plugin uninstall <name>@deviantony-plugins` |
| Remove the marketplace itself | `/plugin marketplace remove deviantony-plugins` |

After marketplace operations you may need to run `/reload-plugins` for changes to take effect.

## cdx — Claude Developer Experience

A bundle of skills covering code review, dependency safety, web security auditing, developer documentation, HTML reports, plain-language explanations, and context-clear handoffs.

Install with `/plugin install cdx@deviantony-plugins`.

### Commands

#### `/cdx:coderev`

Pre-PR code review. Claude runs it on its own before opening a pull request; you can also run it by hand.

- An independent reviewer subagent in a fresh context reviews the whole branch against its base: correctness, whether the change meets its goal, security, added complexity, missed reuse (augmented by `/cdx:scan` when configs are present), conventions, tests and efficiency. Every finding comes with evidence.
- The main agent triages each finding (fix, skip with a reason, or needs you), applies the fixes as a separate `Address review findings` commit and re-runs the project's checks.
- You get a short report of what was fixed, what was skipped and why, and any decisions left for you. If anything needs you, the PR waits for your answer.

#### `/cdx:scan`

Runs jscpd against the project's per-language `.jscpd-<key>.json` configs and reports structured copy-paste duplication findings. Invoked automatically by `/cdx:coderev` when configs exist; can also be run standalone. To enable it, copy a starter config from `cdx/configs/jscpd/<key>.json` (go, ts, python, swift) to your project root as `.jscpd-<key>.json`.

#### `/cdx:safe-deps`

Enforces safe dependency installation: bans `npm`/`yarn`/`npx`, uses `pnpm`/`bun`/`uv`, pins exact versions, requires a 10-day minimum release age, disables post-install scripts. Auto-triggers before any package install.

#### `/cdx:web-security-audit`

Deep web-app security audit combining static code review with live-instance probing. Seven phases (scope, preflight, recon, threat model, investigation, findings, summary), with per-class authorization gates for active testing.

#### `/cdx:dev-docs`

Generates and maintains a `docs/generated/` directory of markdown developer documentation. Surveys the project, proposes a documentation plan, then writes structured docs with YAML frontmatter that tracks the commit each doc was last validated against — so subsequent runs can detect drift via `git diff` against the covered globs.

#### `/cdx:html-report`

Turns a discussion, proposal, investigation, or set of findings into a single self-contained HTML report in the Portainer house style — DM Sans, the design-system palette, verdict bands, comparison tables, pros/cons cards, severity findings, and CSS-only diagrams. Inline CSS, no JavaScript, no build step; always starts from the shipped kitchen-sink template so every report looks like it came from the same hand.

#### `/cdx:sketch-diagram`

Draws an animated, hand-drawn-style technical diagram: ink doodles on beige paper, wobbly rough.js strokes, faint watercolour regions, doodle icons, and dots flowing along the edges. Plans the layout from the content's shape and choreographs the flow so the motion retells the topic, previews frames and fixes issues, then delivers a self-contained HTML file and a seamlessly looping GIF. Fonts (OFL) and rough.js (MIT) are bundled; icons are drawn inline, nothing is fetched from the network.

Prerequisites: `bun`, `ffmpeg`, and a headless Chrome (`$CHROME_PATH`, Playwright's headless shell in `~/.cache/ms-playwright`, or `chromium`/`google-chrome` on `PATH`; `bunx playwright install chromium-headless-shell` installs one).

#### `/cdx:simple`

Explains a topic, problem, solution, or ticket in the simplest possible terms, working from the conversation first and reaching for tools (issue trackers, files, grep) only when context is missing. Starts with a short gist (what it is, why it matters, three key points) and offers more detail one level at a time: a bit more, then the full explanation. Manually invoked, e.g. `/cdx:simple explain the problem` or `/cdx:simple ticket 1234`.

#### `/cdx:wrap`

Prepares for a context clear. Flags uncommitted or conversation-only work that would be lost, brings the repo's written plan file up to date if it keeps one (never creates one), and prints a single self-contained oneliner to paste into a fresh session to resume the next piece of work. Manually invoked, e.g. `/cdx:wrap` or `/cdx:wrap next: add tests`.

## canon — Code Annotation Tool

Browser-based annotation tool for Claude Code that lets you add line-specific feedback to any file, with annotations flowing back into your conversation as structured context.

Install with `/plugin install canon@deviantony-plugins`, then run `/canon:setup` to download the platform-specific binary.

### Commands

- `/canon:setup` — Install or update the Canon binary
- `/canon:new` — Open an annotation session to review code changes

Source: [deviantony/canon](https://github.com/deviantony/canon)
