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

    refusal_kind = refusal["kind"] if refusal is not None else "none"
    refusal_message = refusal["message"] if refusal is not None else "none"
    disclosure_level = disclosure["level"] if disclosure is not None else "none"
    disclosure_text = disclosure["text"] if disclosure is not None else "none"
    mention_external_help = disclosure["mention_external_help"] if disclosure is not None else False

    return "\n".join(
        [
            f"    route.mode={route['mode']} | route.status={route['status']} | route.reason_code={route['reason_code']}",
            f"    route.reason={route['reason']}",
            (
                "    fallback.allowed={allowed} | fallback.used={used} | fallback.refused={refused}"
            ).format(
                allowed=route["fallback_allowed"],
                used=route["fallback_used"],
                refused=route["fallback_refused"],
            ),
            f"    refusal.kind={refusal_kind} | refusal.message={refusal_message}",
            (
                "    disclosure.level={level} | disclosure.mentions_external_help={mention_external_help}"
            ).format(
                level=disclosure_level,
                mention_external_help=mention_external_help,
            ),
            f"    disclosure.text={disclosure_text}",
        ]
    )


def scenario_runtime_owned_local_route() -> tuple[bool, str]:
    truth_surface = base_truth_surface()
    truth_surface["active_spec"] = {"resolved_rules": {"routing.prefer_local": True}}
    truth_surface["disclosure_state"] = {"force_local_disclosure": True}

    result = resolve_runtime_step("routing.prefer_local", truth_surface, default=False)
    disclosure = result.get("disclosure")
    ok = (
        result["precedence"]["winner_source"] == "active_spec"
        and result["route"]["mode"] == "local"
        and result["route"]["status"] == "selected"
        and result["route"]["reason_code"] == "local_policy_default"
        and disclosure is not None
        and disclosure["route_mode"] == "local"
        and disclosure["mention_external_help"] is False
        and "local path" in disclosure["text"].lower()
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
    disclosure = result.get("disclosure")
    ok = (
        result["route"]["mode"] == "hybrid"
        and result["route"]["status"] == "selected"
        and result["route"]["reason_code"] == "quality_support_needed"
        and result["route"]["fallback_used"] is True
        and disclosure is not None
        and disclosure["level"] == "explicit"
        and disclosure["mention_external_help"] is True
        and "external help" in disclosure["text"].lower()
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
    disclosure = result.get("disclosure")
    ok = (
        result["route"]["mode"] == "refused"
        and result["route"]["status"] == "refused"
        and result["route"]["reason_code"] == "fallback_disallowed"
        and result["route"]["fallback_refused"] is True
        and result["route"]["refusal"] is not None
        and disclosure is not None
        and disclosure["level"] == "brief"
        and disclosure["mention_external_help"] is False
        and "refused" in disclosure["text"].lower()
        and "no external execution ran" in disclosure["text"].lower()
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
    print("These restore points prove route, fallback, refusal, and disclosure all come from the same resolve_runtime_step(...) result.")
    for name, fn in scenarios:
        ok, detail = fn()
        status = "PASS" if ok else "FAIL"
        print(f"- {status} {name}")
        print(detail)
        if not ok:
            failures += 1

    if failures:
        print(f"Scenarios failed: {failures}")
        return 1

    print("All runtime route scenarios passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
