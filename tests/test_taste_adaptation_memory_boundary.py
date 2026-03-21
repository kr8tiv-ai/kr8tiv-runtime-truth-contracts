from __future__ import annotations

import contextlib
import io
import json
import runpy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime_types.parsers import (
    load_behavior_signal_entry,
    load_design_teaching_research_record,
    load_feedback_ledger_entry,
    load_preference_record,
    load_truth_surface,
)
from runtime_types.taste_adaptation_memory_boundary import derive_taste_adaptation_record

EXAMPLES = ROOT / "schemas" / "examples"
CLI_PATH = ROOT / "tools" / "inspect_taste_adaptation_memory_boundary.py"


def _example(name: str) -> dict:
    return json.loads((EXAMPLES / name).read_text(encoding="utf-8"))


def _base_truth_surface() -> dict:
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


def _project_preference(*, preference_id: str, rule: str, provenance_level: str = "local-proven") -> dict:
    return {
        "preference_id": preference_id,
        "rule": rule,
        "scope": "project",
        "confidence": 0.93,
        "evidence_count": 3,
        "last_confirmed_at": "2026-03-21T08:00:00Z",
        "conflict_status": "active",
        "origin_feedback_ids": ["fb-local-001"],
        "provenance_level": provenance_level,
    }


def _owner_preference(*, preference_id: str, rule: str, provenance_level: str = "hybrid-proven") -> dict:
    return {
        "preference_id": preference_id,
        "rule": rule,
        "scope": "owner",
        "confidence": 0.88,
        "evidence_count": 2,
        "last_confirmed_at": "2026-03-21T08:00:00Z",
        "conflict_status": "active",
        "origin_feedback_ids": ["fb-owner-001"],
        "provenance_level": provenance_level,
    }


def _feedback(
    *,
    feedback_id: str,
    feedback_text: str,
    target: str,
    applied_to: str,
    scope_requested: str = "turn",
    promotion_status: str = "local-only",
    provenance: str = "not-yet-proven",
    timestamp: str = "2026-03-21T08:05:00Z",
) -> dict:
    return {
        "feedback_id": feedback_id,
        "feedback_text": feedback_text,
        "timestamp": timestamp,
        "scope_requested": scope_requested,
        "target": target,
        "polarity": "correction",
        "source": "user",
        "applied_to": applied_to,
        "promotion_status": promotion_status,
        "provenance": provenance,
    }


def _signal(
    *,
    signal_id: str,
    target: str,
    applied_to: str,
    signal_type: str,
    strength: float,
    source_route: str,
    timestamp: str = "2026-03-21T08:10:00Z",
) -> dict:
    return {
        "signal_id": signal_id,
        "timestamp": timestamp,
        "target": target,
        "signal_type": signal_type,
        "strength": strength,
        "applied_to": applied_to,
        "source_route": source_route,
        "notes": f"{signal_type} evidence for {target}",
    }


class TasteAdaptationMemoryBoundaryTests(unittest.TestCase):
    maxDiff = None

    def test_spec_suppression_keeps_conflicting_signal_visible(self) -> None:
        design_record = load_design_teaching_research_record(
            _example("design-teaching-research-record.blocked.example.json")
        )
        truth_surface = load_truth_surface(
            {
                **_base_truth_surface(),
                "active_spec": {
                    "resolved_rules": {
                        "teaching": "concise support-safe response only",
                    }
                },
                "active_project_preferences": [
                    load_preference_record(
                        _project_preference(
                            preference_id="pref-project-001",
                            rule="design",
                        )
                    )
                ],
                "active_owner_preferences": [
                    load_preference_record(
                        _owner_preference(
                            preference_id="pref-owner-002",
                            rule="teaching",
                        )
                    )
                ],
            }
        )

        record = derive_taste_adaptation_record(
            record_id="taste-adaptation-record-spec-suppressed-001",
            design_teaching_research=design_record,
            truth_surface=truth_surface,
            preference_records=[
                load_preference_record(_project_preference(preference_id="pref-project-001", rule="design")),
                load_preference_record(_owner_preference(preference_id="pref-owner-002", rule="teaching")),
            ],
            feedback_entries=[],
            behavior_signals=[],
        )

        self.assertEqual(record["schema_family"], "s06_taste_adaptation_memory_boundary")
        self.assertEqual(record["design_teaching_research"]["record_id"], design_record["record_id"])
        self.assertEqual([signal["target"] for signal in record["active_taste_signals"]], ["design"])
        self.assertEqual(record["suppressed_taste_signals"][0]["target"], "teaching")
        self.assertEqual(record["suppressed_taste_signals"][0]["suppression_reason"], "active_spec_override")
        self.assertIn("suppressed", record["support_safe_summary"])
        self.assertEqual(record["precedence_summaries"][1]["winner_source"], "active_spec")

    def test_preserved_vs_changed_decisions_follow_behavior_and_promotion_semantics(self) -> None:
        design_record = load_design_teaching_research_record(
            _example("design-teaching-research-record.local-teaching.example.json")
        )
        feedback = load_feedback_ledger_entry(
            _feedback(
                feedback_id="fb-local-001",
                feedback_text="keep the page less glossy",
                target="design",
                applied_to=design_record["record_id"],
                scope_requested="project",
                promotion_status="promoted",
                provenance="local-proven",
            )
        )
        routing_feedback = load_feedback_ledger_entry(
            _feedback(
                feedback_id="fb-routing-001",
                feedback_text="keep this one local if possible",
                target="routing",
                applied_to=design_record["record_id"],
            )
        )
        accepted_signal = load_behavior_signal_entry(
            _signal(
                signal_id="sig-accepted-001",
                target="design",
                applied_to=design_record["record_id"],
                signal_type="accepted_without_edit",
                strength=0.95,
                source_route="local",
            )
        )

        record = derive_taste_adaptation_record(
            record_id="taste-adaptation-record-preserved-decisions-001",
            design_teaching_research=design_record,
            truth_surface=load_truth_surface(_base_truth_surface()),
            preference_records=[
                load_preference_record(_project_preference(preference_id="pref-project-001", rule="design")),
                load_preference_record(_owner_preference(preference_id="pref-owner-002", rule="teaching")),
            ],
            feedback_entries=[feedback, routing_feedback],
            behavior_signals=[accepted_signal],
        )

        preserved_targets = {entry["target"] for entry in record["preserved_decisions"]}
        changed_targets = {entry["target"] for entry in record["changed_decisions"]}
        self.assertIn("design", preserved_targets)
        self.assertIn("teaching", preserved_targets)
        self.assertIn("routing", changed_targets)
        design_preserved = next(entry for entry in record["preserved_decisions"] if entry["target"] == "design")
        self.assertEqual(design_preserved["evidence_class"], "accepted_behavior")
        routing_changed = next(entry for entry in record["changed_decisions"] if entry["target"] == "routing")
        self.assertEqual(routing_changed["warning_flags"], ["suppressed_by_spec"])
        self.assertEqual(record["precedence_summaries"][-1]["suppression_reason"], "insufficient_evidence")

    def test_hybrid_provenance_stays_guarded_when_learning_not_allowed(self) -> None:
        design_record = load_design_teaching_research_record(
            _example("design-teaching-research-record.hybrid-research.example.json")
        )
        hybrid_signal = load_behavior_signal_entry(
            _signal(
                signal_id="sig-accepted-hybrid-001",
                target="design",
                applied_to=design_record["record_id"],
                signal_type="accepted_without_edit",
                strength=0.92,
                source_route="hybrid",
            )
        )

        record = derive_taste_adaptation_record(
            record_id="taste-adaptation-record-hybrid-guarded-001",
            design_teaching_research=design_record,
            truth_surface=load_truth_surface(_base_truth_surface()),
            preference_records=[],
            feedback_entries=[],
            behavior_signals=[hybrid_signal],
        )

        self.assertEqual(len(record["active_taste_signals"]), 1)
        self.assertEqual(record["active_taste_signals"][0]["warning_flags"], ["promotion_guarded"])
        self.assertEqual(record["suppressed_taste_signals"][0]["suppression_reason"], "route_provenance_guard")
        self.assertEqual(
            record["changed_decisions"][0]["warning_flags"],
            ["promotion_guarded", "hybrid_not_promoted"],
        )
        self.assertIn("hybrid", record["support_safe_summary"])

    def test_cli_restore_point_prints_support_safe_scenarios(self) -> None:
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            with self.assertRaises(SystemExit) as ctx:
                runpy.run_path(str(CLI_PATH), run_name="__main__")
        self.assertEqual(ctx.exception.code, 0)
        output = stdout.getvalue()
        self.assertIn("Taste adaptation memory-boundary inspection", output)
        self.assertIn("SCENARIO spec_suppressed", output)
        self.assertIn("SCENARIO preserved_decisions", output)
        self.assertIn("SCENARIO hybrid_guarded", output)
        self.assertNotIn("raw_feedback_text", output)
        self.assertNotIn("private memory payload", output)
        self.assertNotIn("reference dumps", output)


if __name__ == "__main__":
    unittest.main()
