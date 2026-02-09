---
name: review
description: |
  Review recent code changes for simplicity, clarity, and duplication.
  Runs the project's simplifier agent and jscpd duplication detection on changed files.
  Use when user says: "review changes", "review code", "check my code",
  "run review", "code review", or "cdx review".
user-invocable: true
---

# CDX Code Review

You are running the CDX code review workflow. This reviews recently changed files for code simplification opportunities and code duplication.

## Step 1: Identify Recently Changed Files

Determine what files have changed:

1. **Find the diff base**:
   - Get the current branch: `git branch --show-current`
   - If on `main` or `master`: use `HEAD~1` as the base
   - Otherwise: use `git merge-base main HEAD` (fall back to `git merge-base master HEAD`)

2. **Collect changed files**:
   - Committed changes since base: `git diff --name-only <base>...HEAD`
   - Staged changes: `git diff --name-only --cached`
   - Unstaged changes: `git diff --name-only`

3. **Combine and deduplicate** the file lists. Filter out deleted files (verify each file exists).

4. **If no files changed**: Inform the user "No changed files found. Nothing to review." and stop.

5. Report the list of changed files to the user before proceeding.

## Step 2: Discover Project Tools

### Simplifier Agents
- Use Glob to search for `.claude/agents/*-simplifier.md`
- If found: list the discovered agents
- If none found: warn the user — "No simplifier agents found. Run `/cdx:setup` to generate them."

### jscpd Configs
- Use Glob to search for `.jscpd-*.json` in the project root
- If found: list the discovered configs
- If none found: warn the user — "No jscpd configs found. Duplication check will be skipped. Run `/cdx:setup` to set up jscpd."

## Step 3: Run Checks

Run the available checks. Use the Task tool to run them in parallel where possible.

### 3a. Code Simplifier

For each discovered simplifier agent:

1. Read the agent file to get the full simplifier instructions
2. Use the Task tool to spawn a `general-purpose` agent with the following prompt:
   - Include the full content of the simplifier agent file as instructions
   - Pass the list of changed files
   - Instruct it to: read each changed file, identify simplification opportunities, and report findings
   - Instruct it to NOT make any edits — only report what it would change and why
   - Tell it to return a structured summary

### 3b. Duplication Check

For each discovered jscpd config:

1. Run via Bash: `jscpd --config <config-path> . 2>&1 || true`
   - The `|| true` ensures we capture output even if jscpd exits with non-zero (which it does when duplicates are found)
2. Capture the output

If jscpd is not installed (`which jscpd` fails), skip this step and note it in the output.

## Step 4: Present Results

Format and present the combined results:

```
## Code Review Results

### Code Simplifier
[Summary from each simplifier agent — what files were reviewed, what simplifications were suggested]

### Duplication Check (advisory)
[jscpd output for each config]

Note: Duplication findings are advisory and non-blocking. Not all duplication warrants
extraction — consider whether the duplicated code shares genuine intent before refactoring.
```

If no simplifier agents were found, show only the duplication results (or vice versa).
If neither tool was available, explain what's missing and suggest running `/cdx:setup`.

## Step 5: Offer Next Steps

Use AskUserQuestion to let the user decide what to do:

Build the options list dynamically based on what was found:

- **If the simplifier suggested changes**: Include "Apply simplifier suggestions" as an option
  - If selected: re-run the simplifier agents but this time instruct them to actually make the edits using the Edit tool
- **If duplicates were found**: Include "View duplication details" and "Address duplications" as options
  - "View duplication details": show the full jscpd output with file paths and line numbers
  - "Address duplications": for each duplication found, read both code locations and suggest a refactoring approach
- **Always include**: "Looks good, skip all" as an option
  - If selected: end the review with a confirmation message

If neither the simplifier nor jscpd had findings, skip this step and congratulate the user: "All checks passed. Code looks clean!"
