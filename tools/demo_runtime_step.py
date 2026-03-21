from runtime_types.parsers import load_truth_surface
from runtime_types.runtime_step import resolve_runtime_step

import json
from pathlib import Path


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def print_route_summary(result: dict) -> None:
    route = result["route"]
    disclosure = result.get("disclosure")
    refusal = route.get("refusal")

    print(f"- route mode: {route['mode']}")
    print(f"- route status: {route['status']}")
    print(f"- route reason code: {route['reason_code']}")
    print(f"- route reason: {route['reason']}")
    print(f"- fallback allowed: {route['fallback_allowed']}")
    print(f"- fallback used: {route['fallback_used']}")
    print(f"- fallback refused: {route['fallback_refused']}")
    if refusal is not None:
        print(f"- refusal kind: {refusal['kind']}")
        print(f"- refusal message: {refusal['message']}")
    else:
        print("- refusal kind: none")
        print("- refusal message: none")

    if disclosure is not None:
        print(f"- disclosure level: {disclosure['level']}")
        print(f"- disclosure route mode: {disclosure['route_mode']}")
        print(f"- disclosure mentions external help: {disclosure['mention_external_help']}")
        print(f"- disclosure text: {disclosure['text']}")
    else:
        print("- disclosure level: none")
        print("- disclosure route mode: none")
        print("- disclosure mentions external help: False")
        print("- disclosure text: none")


def print_artifact_summary(result: dict) -> None:
    artifacts = result["artifacts"]
    provenance = artifacts["provenance"]
    feedback_selection = artifacts["feedback_selection"]
    promotion_analysis = artifacts["promotion_analysis"]

    print(f"- artifact schema version: {artifacts['schema_version']}")
    print(
        "- artifact provenance: "
        f"route_mode={provenance['route_mode']}, "
        f"route_status={provenance['route_status']}, "
        f"route_reason_code={provenance['route_reason_code']}, "
        f"disclosure_level={provenance['disclosure_level']}, "
        f"disclosure_present={provenance['disclosure_present']}"
    )
    print(
        "- artifact feedback selection: "
        f"selected={feedback_selection['selected']}, "
        f"feedback_id={feedback_selection['feedback_id']}, "
        f"target={feedback_selection['target']}, "
        f"scope={feedback_selection['scope_requested']}, "
        f"promotion_status={feedback_selection['promotion_status']}"
    )
    print(
        "- artifact promotion analysis: "
        f"status={promotion_analysis['status']}, "
        f"decision={promotion_analysis['decision']}, "
        f"blocking_signal={promotion_analysis['blocking_signal_type']}, "
        f"supporting_signal_used={promotion_analysis['supporting_signal_used']}"
    )
    print(f"- artifact audit summary: {promotion_analysis['audit_summary']}")


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    truth_surface_path = root / "schemas" / "examples" / "truth-surface.example.json"
    truth_surface = load_truth_surface(load_json(truth_surface_path))

    result = resolve_runtime_step(
        "design",
        truth_surface,
        default="neutral",
        evaluate_promotion=True,
        project_repeat_count=1,
    )

    print("Runtime demo")
    print(f"- truth surface loaded: {truth_surface_path.name}")
    print("- route source: runtime-owned derive_route_decision(...) inside resolve_runtime_step(...)")
    print(f"- precedence winner: {result['precedence']['winner_source']}")
    print(f"- precedence value: {result['precedence']['winner_value']}")
    print_route_summary(result)
    print_artifact_summary(result)

    if "promotion" in result:
        print(f"- promotion decision: {result['promotion']['decision']}")
        print(f"- promotion reason: {result['promotion']['reason']}")

    print(
        "- inspection hint: inspect result['artifacts'] first, then compare against tools/runtime_scenarios.py, "
        "runtime_types/README.md, and tests.test_runtime_types.RuntimeStepTests when route/disclosure or training/eval behavior drifts"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
