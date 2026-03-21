# Python Runtime Contract Types

## Purpose
This package provides the first Python consumer-facing type layer above the schema package.

It mirrors the validated runtime contract using:
- `Literal` aliases for bounded string states
- `TypedDict` definitions for the core runtime objects
- thin parser/bridge helpers that validate payloads against the schema contract before returning typed runtime objects

## Files
- `contracts.py` — core aliases and `TypedDict` contracts
- `schema_validation.py` — shared recursive schema validation core
- `parsers.py` — typed loader/bridge functions
- `feedback_selection.py` — scope-aware relevant-feedback selector
- `behavior_signals.py` — behavioral evidence summarization helpers
- `promotion_audit.py` — compact formatter for promotion audit summaries
- `routing.py` — pure runtime-owned route derivation from `TruthSurface`
- `disclosure.py` — canonical route-result-driven disclosure/refusal formatting
- `runtime_step.py` — one-step composition across precedence, route, disclosure, and promotion
- `__init__.py` — public exports

## Relationship to `schemas/`
- `schemas/` is the canonical portable contract layer.
- `runtime_types/` is the first Python-native consumer layer.
- The Python types intentionally remain thin and close to the JSON-shaped contract.

## What is modeled here
- `FeedbackLedgerEntry`
- `PreferenceRecord`
- `RoutingProvenanceEvent`
- `RouteDecisionResult`
- `PromotionDecisionRecord`
- `BehaviorSignalEntry`
- `TruthSurface`
- shared schema validation helpers
- thin parser/bridge functions
- a first-pass precedence resolver
- a first-pass runtime-owned route core
- a first-pass composed runtime step

## What is not modeled yet
- business logic beyond the narrow proof seams already checked into the repo
- storage
- service interfaces
- coercive parsing or default injection

## Bridge behavior
The parser layer is intentionally thin:
- validates payloads against the schema contract
- returns typed runtime payloads
- raises `ValueError` on invalid data
- does not infer, mutate, or repair inputs

## Why TypedDicts
TypedDicts are the lowest-risk first consumer layer for a schema-first repo: standard-library only, easy to import, and faithful to JSON-shaped runtime payloads.

## First executable behavior
A first-pass precedence resolver exists in `runtime_types/precedence.py`.

It currently resolves a single key using this order:
1. active spec (`active_spec.resolved_rules`)
2. explicit feedback
3. project preference
4. owner preference
5. default

This seam is intentionally narrow. It does not mutate state, promote feedback, or implement domain-specific inference.

## First executable learning behavior
A first-pass feedback promotion evaluator exists in `runtime_types/promotion.py`.

It currently decides between:
- `reject`
- `local-only`
- `project`
- `owner`

based on explicit safety, repeat counts, provenance warning state, and summarized behavioral evidence such as user repair, non-adoption, reversion, or acceptance without edit.

Its result also exposes a small audit surface:
- `blocking_signal_type`
- `supporting_signal_used`

A compact summary formatter in `runtime_types/promotion_audit.py` keeps those decisions inspectable without persisting extra runtime state.

## First executable honesty behavior
A first-pass route-result-driven disclosure formatter exists in `runtime_types/disclosure.py`.

The canonical honesty seam is:
1. `derive_route_decision(truth_surface)` in `runtime_types/routing.py`
2. `resolve_runtime_step(...)` in `runtime_types/runtime_step.py`
3. `format_route_disclosure(result["route"], ...)` in `runtime_types/disclosure.py`

That seam ensures user-facing disclosure and refusal wording are derived from the same `result["route"]` object the runtime actually selected. `format_provenance_disclosure(...)` still exists only as a legacy compatibility bridge for older provenance-event callers and should not be treated as the truth source for new runtime behavior.

The route-driven formatter can distinguish:
- local path
- hybrid path
- fallback-refused path

It returns a small structured result with disclosure level, text, whether external help must be mentioned, plus the route mode/status it is narrating.

## First executable route core
A first-pass runtime-owned route core now exists in `runtime_types/routing.py`.

`derive_route_decision(truth_surface)` is the canonical route seam for S01. It inspects only existing `TruthSurface` fields and returns a schema-backed `RouteDecisionResult` with:
- `mode`
- `status`
- `reason`
- `reason_code`
- `fallback_allowed`
- `fallback_used`
- `fallback_refused`
- `refusal`

The current restore-point logic proves three bounded outcomes:
1. `local` when policy keeps the step on the local path
2. `hybrid` when high-complexity work is allowed to use fallback support
3. `refused` when local-only or budget conditions forbid fallback escalation

The important contract change is ownership: callers do not supply canonical route truth anymore. They supply `TruthSurface`; the runtime derives the route result.

## First composed service layer
A first-pass runtime step service exists in `runtime_types/runtime_step.py`.

`resolve_runtime_step(...)` now composes existing behavior for one step by combining:
- precedence resolution
- runtime-owned route derivation
- optional disclosure/refusal formatting derived from the runtime route result
- optional feedback promotion evaluation

The stable route surface is returned directly as `result["route"]`. When disclosure is present, it must be interpreted as a narration of that route block rather than an independent truth source.

## Inspection and restore points
The repo keeps a stdlib-first proof style. The main inspection surfaces are:
- `tests/test_runtime_types.py` — direct contract and composition assertions, including contradiction resistance and script-alignment checks
- `tools/runtime_scenarios.py` — readable local/hybrid/refused route scenarios from truth-surface inputs, printed with fallback, refusal, and disclosure together
- `tools/demo_runtime_step.py` — compact single-run demo of the composed runtime step against the example truth surface
- `schemas/examples/truth-surface.example.json` — example truth input that feeds the demo and exercises governed fallback disclosure

Recommended commands:
- `python -m unittest tests.test_runtime_types`
- `python tools/runtime_scenarios.py`
- `python tools/demo_runtime_step.py`
- `python tools/validate_schemas.py`
- `python -m unittest tests.test_runtime_types.RuntimeStepTests.test_runtime_step_derives_refused_route_from_truth_surface_inputs`

## How to localize failures
Use the output surfaces to narrow failures quickly:
- If `tools/validate_schemas.py` fails, the contract or example payloads drifted at the parser/schema boundary.
- If `tools/runtime_scenarios.py` fails on one route mode, inspect `runtime_types/routing.py` first, then `runtime_types/disclosure.py`; the scenario output prints route mode/status/reason, fallback flags, refusal details, and disclosure text from the same runtime-owned result.
- If `tools/demo_runtime_step.py` shows the right route but wrong disclosure or refusal narration, inspect `runtime_types/runtime_step.py` composition and confirm the example truth surface still drives the intended fallback policy.
- If `tests.test_runtime_types.RuntimeRouteDecisionContractTests` fail, the parser/schema boundary for route decisions no longer matches the canonical contract.
- If `tests.test_runtime_types.RuntimeStepTests` fail, the composed step no longer preserves the expected runtime-owned route/disclosure seam.
- If disclosure text and route mode disagree, compare `result["route"]` and `result["disclosure"]` from the same `resolve_runtime_step(...)` call before inspecting any caller-authored provenance event.

## Process note for future agents
The planning/process trail for this slice explicitly referenced the superpowers workflow skills `using-superpowers`, `brainstorming`, and `writing-plans`. This task keeps the resulting restore points lightweight and stdlib-first so later slices can inspect the route seam without re-planning or introducing extra tooling.
