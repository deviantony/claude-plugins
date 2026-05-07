---
name: scan
description: |
  Runs jscpd against the project's per-language configs and reports structured
  duplication findings. Invoke during code review (cdx:coderev calls this for
  tool-backed reuse analysis), when checking for copy-paste duplication, or
  before committing. Setup creates the configs (`.jscpd-<key>.json`); this
  skill consumes them.
user-invocable: true
---

# CDX Scan

Deterministic duplication detection. Wraps `jscpd` against any `.jscpd-<key>.json` configs at the project root (created by `/cdx:setup`) and translates the output into a structured findings table.

Supported keys: `go`, `ts`, `python`, `swift`.

## Procedure

### 1. Determine scope

If invoked with a comma-separated list of changed file paths in `args`, store it as `CHANGED`. Use the file extensions to decide which configs to run:

- `.go` → `go`
- `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs` → `ts`
- `.py` → `python`
- `.swift` → `swift`

If `CHANGED` is empty, run every config that exists.

Glob the project root for `.jscpd-*.json`. If none match the in-scope keys, report `no jscpd configs found — run /cdx:setup first` and stop.

### 2. Pre-checks

Run `which jscpd`. If missing, report `jscpd not installed — install via "pnpm add -g jscpd"` and stop.

### 3. Run jscpd for each in-scope config

For each config:

```bash
out=$(mktemp -d)
jscpd --config <config> --reporters consoleFull,json --output "$out"
cat "$out/jscpd-report.json"
rm -rf "$out"
```

The `consoleFull` reporter gives the user the human-readable diff blocks; the `json` reporter gives parseable output for the findings table.

If a run errors, capture the message and continue with the next config — never stop the whole scan because one config failed.

### 4. Parse findings

Each clone in the report's `duplicates` array has:

- `firstFile`: `{ name, start, end }`
- `secondFile`: `{ name, start, end }`
- `lines`, `tokens`, `fragment`

For each clone, build a finding:

- File A path + line range, File B path + line range
- Lines duplicated
- **Priority**: `high` if `lines > 50` (significant maintenance burden), otherwise `medium`
- **Status**: if `CHANGED` is non-empty, mark `in diff` when either file appears in `CHANGED`; otherwise `pre-existing`. If `CHANGED` is empty, omit the status column.

Sort: `high` before `medium`; within each priority, `in diff` before `pre-existing`.

### 5. Output

```
## Scan Results — Duplication

### Summary
- Configs run: [list]
- Total clones: N (M in diff, K pre-existing)   ← omit the parenthesized split if CHANGED was empty
- Configs skipped: [list, with reason]           ← omit line if none

### Findings

| # | Pri | Status | File A | Lines A | File B | Lines B | Size | Action |
|---|-----|--------|--------|---------|--------|---------|------|--------|
```

`Action` should be a one-line, specific suggestion: typically `extract shared helper`, `consolidate into existing utility at <path>`, or `merge implementations` — pick what fits. Don't write generic advice.

If no clones are found across all in-scope configs, output: `✓ No significant duplication detected across [N] config(s).`

When invoked from `cdx:coderev`, the orchestrator will pull these findings and pass them to the Reuse review agent as tool-backed input.

## Constraints

- **Never** modify code — analysis only
- **Never** edit jscpd configs to silence findings — configs are user-owned; if thresholds are off, the user adjusts them in `cdx/configs/jscpd/<key>.json` (during a re-run of `/cdx:setup`) or by hand
- **Never** dismiss a `pre-existing` finding without surfacing it — let the user decide what to act on
