# AGENTS.md

## What this repo is
A **workflow/scaffolding repo** for OpenSpec spec-driven development. No application code lives here. Changes are managed via the OpenSpec workflow: propose -> implement -> archive.

## OpenSpec CLI
- `openspec` is the primary CLI tool (expected to be available in the agent environment via `@opencode-ai/plugin`)
- Key commands:
  - `openspec list --json` - list active changes
  - `openspec new change "<name>"` - scaffold a new change
  - `openspec status --change "<name>" --json` - check artifact/task status
  - `openspec instructions <artifact-id> --change "<name>" --json` - get artifact template
  - `openspec instructions apply --change "<name>" --json` - get apply-ready instructions

## Custom slash commands
- `/opsx-propose` - create a change (proposal + design + tasks)
- `/opsx-apply` - implement tasks from a change
- `/opsx-archive` - archive a completed change
- `/opsx-explore` - enter explore/thinking mode

## Three agent config mirrors
Changes to `.opencode/` must be mirrored in `.codebuddy/` and `.roo/`. All three have identical skills and command structures.

## No build / test / lint / dev commands
This repo has no application source code. No build, test, lint, or typecheck commands exist.

## Change artifact layout
- `openspec/changes/<name>/` - active changes (proposal.md, design.md, tasks.md)
- `openspec/changes/archive/` - archived changes
- `openspec/specs/` - capability specs
