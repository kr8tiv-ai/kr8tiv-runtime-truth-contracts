#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime_types.runtime_step import resolve_runtime_step


def base_truth_surface() -> dict:
    return {
        "active_spec": {},
        "active_policy": {},
        "current_task": {},
        "persona_anchor": {},
        "routing_policy": {},
        "fallback_policy": {},
        "critique_policy": {},
        "revision_budget": {},
        "active_project_preferences": [],
        "active_owner_preferences": [],
        "recent_explicit_feedback": [],
        "recent_behavior_signals": [],
        "disclosure_state": {},
    }


def route_summary(result: dict) -> str:
    route = result["route"]
    refusal = route.get("refusal")
    disclosure = result.get("disclosure")
    refusal_text = "none"
    if refusal is not None:
        refusal_text = f"{refusal['kind']} | {refusal['message']}"

    disclosure_text = "none"
    if disclosure is not None:
        disclosure_text = f"{disclosure['level']} | {disclosure['text']}"

    return " | ".join(
        [
            f"mode={route['mode']}",
            f"status={route['status']}",
            f"reason_code={route['reason_code']}",
            f"reason={route['reason']}",
            f"fallback_allowed={route['fallback_allowed']}",
            f"fallback_used={route['fallback_used']}",
            f"fallback_refused={route['fallback_refused']}",
            f"refusal={refusal_text}",
            f"disclosure={disclosure_text}",
        ]
    )


def scenario_runtime_owned_local_route() -> tuple[bool, str]:
    truth_surface = base_truth_surface()
    truth_surface["active_spec"] = {"resolved_rules": {"routing.prefer_local": True}}

    result = resolve_runtime_step("routing.prefer_local", truth_surface, default=False)
    ok = (
        result["precedence"]["winner_source"] == "active_spec"
        and result["route"]["mode"] == "local"
        and result["route"]["status"] == "selected"
        and result["route"]["reason_code"] == "local_policy_default"
        and "disclosure" not in result
    )
    return ok, route_summary(result)


def scenario_runtime_owned_hybrid_route() -> tuple[bool, str]:
    truth_surface = base_truth_surface()
    truth_surface["routing_policy"] = {
        "default_mode": "local",
        "high_complexity_allows_hybrid": True,
    }
    truth_surface["current_task"] = {
        "task_id": "scenario-hybrid",
        "phase": "generation",
        "target_outcome": "Complex generation task needing broader capability.",
        "complexity": "high",
    }
    truth_surface["fallback_policy"] = {
        "must_disclose_material_external_help": True,
        "refuse_on_local_only_tasks": False,
    }

    result = resolve_runtime_step("routing.prefer_local", truth_surface, default=True)
    ok = (
        result["route"]["mode"] == "hybrid"
        and result["route"]["status"] == "selected"
        and result["route"]["reason_code"] == "quality_support_needed"
        and result["route"]["fallback_used"] is True
        and result.get("disclosure", {}).get("level") == "explicit"
    )
    return ok, route_summary(result)


def scenario_runtime_owned_refused_route() -> tuple[bool, str]:
    truth_surface = base_truth_surface()
    truth_surface["routing_policy"] = {
        "default_mode": "local",
        "high_complexity_allows_hybrid": True,
    }
    truth_surface["current_task"] = {
        "task_id": "scenario-refused",
        "phase": "generation",
        "target_outcome": "Local-only task that forbids fallback.",
        "complexity": "high",
        "local_only": True,
    }
    truth_surface["fallback_policy"] = {
        "must_disclose_material_external_help": True,
        "refuse_on_local_only_tasks": True,
    }

    result = resolve_runtime_step("routing.prefer_local", truth_surface, default=True)
    ok = (
        result["route"]["mode"] == "refused"
        and result["route"]["status"] == "refused"
        and result["route"]["reason_code"] == "fallback_disallowed"
        and result["route"]["fallback_refused"] is True
        and result["route"]["refusal"] is not None
        and result.get("disclosure", {}).get("level") == "brief"
    )
    return ok, route_summary(result)


def main() -> int:
    scenarios = [
        ("runtime-owned-local-route", scenario_runtime_owned_local_route),
        ("runtime-owned-hybrid-route", scenario_runtime_owned_hybrid_route),
        ("runtime-owned-refused-route", scenario_runtime_owned_refused_route),
    ]

    failures = 0
    print("Runtime route scenarios")
    print("These restore points prove route choice comes from TruthSurface inputs inside resolve_runtime_step(...).")
    for name, fn in scenarios:
        ok, detail = fn()
        status = "PASS" if ok else "FAIL"
        print(f"- {status} {name}")
        print(f"  {detail}")
        if not ok:
            failures += 1

    if failures:
        print(f"Scenarios failed: {failures}")
        return 1

    print("All runtime route scenarios passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
