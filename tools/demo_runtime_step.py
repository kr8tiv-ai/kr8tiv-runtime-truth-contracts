#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime_types.parsers import load_truth_surface
from runtime_types.runtime_step import resolve_runtime_step


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    truth_surface_path = ROOT / "schemas" / "examples" / "truth-surface.example.json"
    truth_surface = load_truth_surface(load_json(truth_surface_path))

    result = resolve_runtime_step(
        "routing.prefer_local",
        truth_surface,
        default=False,
        evaluate_promotion=True,
        project_repeat_count=2,
    )

    route = result["route"]

    print("Runtime demo")
    print(f"- truth surface loaded: {truth_surface_path.name}")
    print("- route source: runtime-owned derive_route_decision(...) inside resolve_runtime_step(...)")
    print(f"- precedence winner: {result['precedence']['winner_source']}")
    print(f"- precedence value: {result['precedence']['winner_value']}")
    print(f"- route mode: {route['mode']}")
    print(f"- route status: {route['status']}")
    print(f"- route reason code: {route['reason_code']}")
    print(f"- route reason: {route['reason']}")
    print(f"- fallback allowed: {route['fallback_allowed']}")
    print(f"- fallback used: {route['fallback_used']}")
    print(f"- fallback refused: {route['fallback_refused']}")
    if route["refusal"] is not None:
        print(f"- refusal kind: {route['refusal']['kind']}")
        print(f"- refusal message: {route['refusal']['message']}")
    else:
        print("- refusal kind: none")

    if "disclosure" in result:
        print(f"- disclosure level: {result['disclosure']['level']}")
        print(f"- disclosure text: {result['disclosure']['text']}")
    else:
        print("- disclosure level: none")

    if "promotion" in result:
        print(f"- promotion decision: {result['promotion']['decision']}")
        print(f"- promotion reason: {result['promotion']['reason']}")

    print("- inspection hint: compare the route block above against tools/runtime_scenarios.py and tests.test_runtime_types.RuntimeStepTests")
    return 0


if __name__ == "__main__":
    sys.exit(main())
