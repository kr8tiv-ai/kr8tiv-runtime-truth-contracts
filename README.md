# KR8TIV Runtime Truth Contracts

Public schema-first contract repo for KR8TIV local-first routing, governed fallback, scoped feedback learning, and auditable behavioral shaping.

## What this is
This repo defines a small runtime-truth surface for systems that need to decide:
- what rule wins right now
- when fallback must be disclosed
- when feedback should remain local
- when feedback can be promoted
- how quiet behavioral evidence like repair or non-adoption should shape future learning

It is intentionally contract-oriented rather than product-complete.

## Repo structure
- `schemas/` — portable JSON Schemas for truth surfaces, feedback, preferences, provenance, promotion, and behavioral signals
- `runtime_types/` — Python `TypedDict` layer and thin runtime helpers
- `tools/` — schema validator, demo script, org/repo helpers, and runtime scenario harness
- `tests/` — stdlib regression tests for logic, parser boundaries, and audit formatting
- `runtime/` — supporting runtime notes and contract context
- `specs/` — design/reference specs
- `verification/` — validation checklists and contract verification notes
- `docs/plans/` — design and implementation plans used to shape the current contract

A good starting note for the public shape of the work is:
- `specs/why-this-exists-and-node-atomicity.md`

## Current capabilities
- precedence resolution across spec, explicit feedback, preferences, and defaults
- provenance disclosure formatting for local, hybrid, external, and fallback-refused paths
- feedback promotion decisions with behavioral shaping
- scope-aware explicit feedback selection
- behavioral evidence summarization for:
  - repair
  - non-adoption
  - reversion
  - accepted-without-edit
- compact promotion-audit formatting for scripts and future UI/reporting

## Verification
Run:
- `python tools/validate_schemas.py`
- `python -c "import runpy; runpy.run_path('tests/test_runtime_types.py', run_name='__main__')"`
- `python tools/runtime_scenarios.py`

## Public-repo boundary
This repo should stay public-safe.
Do not add:
- secrets or credentials
- private tenant/user data
- raw sensitive transcripts
- `.gsd/` working state
- local browser/session artifacts

## Status
This is an active contract/prototype repo, not a finished runtime product. The goal is to keep the truth surface explicit, testable, and portable while the wider KR8TIV stack evolves.
