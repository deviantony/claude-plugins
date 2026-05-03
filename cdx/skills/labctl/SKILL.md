---
name: labctl
description: Manage DigitalOcean VMs using the labctl CLI — create, list, and remove droplets. Use this skill whenever the user mentions VMs, droplets, lab machines, spinning up servers, creating instances, SSH-ing into a box, or anything related to managing DigitalOcean infrastructure via labctl. Also trigger when the user wants to check what VMs are running, tear down machines, or provision new ones — even if they don't say "labctl" explicitly.
user-invocable: true
---

# labctl — DigitalOcean VM Manager

You manage VMs through the `labctl` CLI. Every interaction starts with a health check, and every operation that surfaces VMs ends with actionable SSH commands.

## First: Always verify connectivity

Before running any labctl command, run:

```bash
labctl status
```

If the output does not contain `API:      ok`, stop and tell the user their API connection is down. Don't proceed with any other commands until this passes.

## Discover available options

When the user asks to create a VM and hasn't specified a region or size (or you're unsure what's available), run:

```bash
labctl options --json
```

This shows the available regions and sizes with their aliases. Use the **alias** (not the DO slug) when passing flags to `labctl create`. Here's a quick reference, but always confirm with `labctl options` since these can change:

| Region alias | Location       |
|-------------|----------------|
| usw         | San Francisco  |
| use         | New York       |
| eu          | Frankfurt      |
| ap          | Singapore      |
| au          | Sydney         |

| Size alias | Spec              |
|-----------|-------------------|
| xs        | 1 vCPU, 512MB RAM |
| s         | 1 vCPU, 1GB RAM   |
| m         | 2 vCPU, 4GB RAM   |
| l         | 4 vCPU, 8GB RAM   |
| xl        | 8 vCPU, 16GB RAM  |

If the user asks what's available, show them this table (refreshed from `labctl options`).

## Creating VMs

```bash
labctl create -r <region> -s <size> -n <name> --json
```

- `-r` region alias (default: `eu`)
- `-s` size alias (default: `xs`)
- `-n` name for the droplet
- `--json` always use this flag — the JSON output includes the `id` and `ipv4` of the new droplet directly, so you don't need a separate `ls` call

When creating **multiple VMs**, run one `labctl create` command per VM. You can run them in parallel if the names and configs are independent. Each `create --json` returns the droplet's IP, so collect all results and output the SSH connection block (see below).

If the user doesn't specify a name, generate a descriptive one (e.g., `dev-api-1`, `test-worker-eu`). If they're creating multiple similar VMs, use a numbered suffix (`worker-1`, `worker-2`, etc.).

## Listing VMs

```bash
labctl ls --json
```

Use `--json` so you can reliably parse the output. Each entry contains `id`, `name`, `ipv4`, `region`, `size`, and `created_at`.

Calculate the **uptime** for each VM from the `created_at` timestamp relative to the current time. Show it in a human-friendly format: seconds/minutes for very recent VMs, hours for same-day, days for older ones (e.g., "3m", "5h", "42d").

After listing, always output the SSH connection block for every VM.

## SSH connection block

After any create or list operation, output a clearly formatted block with SSH commands. This is the most important part of the output for the user — they want to immediately jump into their boxes.

Each VM gets its own separate fenced code block. This matters because the user copies individual SSH commands from the rendered output — a single combined block makes that harder. Here's the exact format:

```
## SSH Access

| VM | IP | Region | Size | Uptime |
|----|-----|--------|------|--------|
| my-vm-1 | 203.0.113.10 | eu | m | 2h |
| my-vm-2 | 198.51.100.5 | usw | s | 45d |

​```bash
ssh -o StrictHostKeyChecking=no root@203.0.113.10  # my-vm-1
​```
​```bash
ssh -o StrictHostKeyChecking=no root@198.51.100.5  # my-vm-2
​```
```

Always include `-o StrictHostKeyChecking=no` so the user can connect without interactive prompting.

## Removing VMs

```bash
labctl rm <id> [<id> ...]
```

Takes one or more droplet IDs (numeric). Multiple IDs can be passed in a single `rm` command.

Removing a VM is destructive and irreversible. Before executing `labctl rm`, you must ask the user for explicit approval. Show them the VM details (name, IP, ID) and ask "Should I proceed with removing this VM?" — then stop and wait for their response. Do not run the rm command in the same turn as the confirmation prompt. This is a two-step process: first show and ask, then (only after the user confirms) execute the removal.

If the user refers to a VM by **name** rather than ID, first run `labctl ls --json` to resolve the name to an ID.

## General guidance

- Always use `--json` on every labctl command that supports it (`create`, `ls`, `options`). This gives structured output that's easier to work with. The `rm` command supports `--json` but only produces log lines, not structured output.
- If a command fails, include the error output in your response so the user can see what went wrong.
- When the user is vague ("give me a box"), default to region `eu` and size `s` — a reasonable general-purpose default — but mention what you picked so they can adjust.
