from __future__ import annotations

import io
import json
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime_types.disclosure import (
    format_provenance_disclosure,
    format_route_disclosure,
)
from runtime_types.feedback_selection import select_relevant_feedback
from runtime_types.parsers import (
    load_behavior_signal_entry,
    load_route_decision_result,
    load_runtime_step_artifacts,
    load_truth_surface,
)
from runtime_types.precedence import resolve_precedence
from runtime_types.promotion import evaluate_feedback_promotion
from runtime_types.promotion_audit import format_promotion_audit
from runtime_types.runtime_step import resolve_runtime_step
from tools import demo_runtime_step, runtime_scenarios


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


def base_feedback() -> dict:
    return {
        "feedback_id": "f1",
        "feedback_text": "less glossy",
        "timestamp": "2026-03-20T00:00:00Z",
        "scope_requested": "turn",
        "target": "design",
        "polarity": "correction",
        "source": "user",
        "applied_to": "x",
        "promotion_status": "local-only",
        "provenance": "not-yet-proven",
    }


class FeedbackSelectionTests(unittest.TestCase):
    def test_prefers_turn_scope_over_broader_scope_when_both_match(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-project",
                "feedback_text": "less glossy at the project level",
                "scope_requested": "project",
                "target": "design",
                "timestamp": "2026-03-20T00:00:00Z",
            },
            {
                **base_feedback(),
                "feedback_id": "f-turn",
                "feedback_text": "less glossy for this turn",
                "scope_requested": "turn",
                "target": "design",
                "timestamp": "2026-03-19T00:00:00Z",
            },
        ]

        result = select_relevant_feedback("design", ts)

        self.assertIsNotNone(result)
        self.assertEqual(result["feedback_id"], "f-turn")

    def test_ignores_expired_and_rejected_feedback(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-expired",
                "promotion_status": "expired",
                "target": "design",
            },
            {
                **base_feedback(),
                "feedback_id": "f-rejected",
                "promotion_status": "rejected",
                "target": "design",
            },
        ]

        result = select_relevant_feedback("design", ts)

        self.assertIsNone(result)

    def test_prefers_more_recent_feedback_when_scope_is_equal(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-old",
                "feedback_text": "older feedback",
                "scope_requested": "turn",
                "target": "design",
                "timestamp": "2026-03-19T00:00:00Z",
            },
            {
                **base_feedback(),
                "feedback_id": "f-new",
                "feedback_text": "newer feedback",
                "scope_requested": "turn",
                "target": "design",
                "timestamp": "2026-03-20T00:00:00Z",
            },
        ]

        result = select_relevant_feedback("design", ts)

        self.assertIsNotNone(result)
        self.assertEqual(result["feedback_id"], "f-new")


class ParserBoundaryTests(unittest.TestCase):
    def test_load_behavior_signal_entry_accepts_valid_payload(self) -> None:
        payload = {
            "signal_id": "sig-201",
            "timestamp": "2026-03-20T18:50:00Z",
            "target": "design",
            "signal_type": "user_repair",
            "strength": 0.9,
            "applied_to": "example-task-001",
            "source_route": "local",
            "notes": "User manually simplified the generated hero treatment after review.",
        }

        result = load_behavior_signal_entry(payload)

        self.assertEqual(result["signal_type"], "user_repair")
        self.assertEqual(result["target"], "design")

    def test_load_behavior_signal_entry_rejects_invalid_signal_type(self) -> None:
        payload = {
            "signal_id": "sig-bad",
            "timestamp": "2026-03-20T18:50:00Z",
            "target": "design",
            "signal_type": "mystery_signal",
            "strength": 0.9,
            "applied_to": "example-task-001",
            "source_route": "local",
            "notes": "Invalid signal type.",
        }

        with self.assertRaises(ValueError):
            load_behavior_signal_entry(payload)

    def test_load_truth_surface_requires_recent_behavior_signals(self) -> None:
        payload = base_truth_surface()
        del payload["recent_behavior_signals"]

        with self.assertRaises(ValueError):
            load_truth_surface(payload)


class RuntimeStepArtifactParserTests(unittest.TestCase):
    def test_load_runtime_step_artifacts_accepts_populated_payload(self) -> None:
        payload = {
            "schema_version": "1.0",
            "provenance": {
                "route_mode": "hybrid",
                "route_status": "selected",
                "route_reason_code": "quality_support_needed",
                "fallback_used": True,
                "fallback_refused": False,
                "disclosure_level": "explicit",
                "disclosure_mentions_external_help": True,
                "disclosure_present": True,
            },
            "feedback_selection": {
                "selected": True,
                "feedback_id": "fb-201",
                "target": "design",
                "scope_requested": "turn",
                "promotion_status": "local-only",
                "provenance": "not-yet-proven",
            },
            "promotion_analysis": {
                "status": "evaluated",
                "decision": "project",
                "reason": "Repeated design correction qualifies for project promotion.",
                "provenance_warning": False,
                "blocking_signal_type": None,
                "supporting_signal_used": True,
                "audit_summary": "decision=project; signal=accepted_without_edit",
            },
        }

        result = load_runtime_step_artifacts(payload)

        self.assertEqual(result["provenance"]["route_mode"], "hybrid")
        self.assertTrue(result["feedback_selection"]["selected"])
        self.assertEqual(result["promotion_analysis"]["status"], "evaluated")

    def test_load_runtime_step_artifacts_accepts_empty_case_payload(self) -> None:
        payload = {
            "schema_version": "1.0",
            "provenance": {
                "route_mode": "local",
                "route_status": "selected",
                "route_reason_code": "local_policy_default",
                "fallback_used": False,
                "fallback_refused": False,
                "disclosure_level": "none",
                "disclosure_mentions_external_help": False,
                "disclosure_present": False,
            },
            "feedback_selection": {
                "selected": False,
                "feedback_id": None,
                "target": None,
                "scope_requested": None,
                "promotion_status": None,
                "provenance": None,
            },
            "promotion_analysis": {
                "status": "not_evaluated",
                "decision": None,
                "reason": "No matching feedback was selected for promotion evaluation.",
                "provenance_warning": False,
                "blocking_signal_type": None,
                "supporting_signal_used": False,
                "audit_summary": "decision=not_evaluated; signal=none",
            },
        }

        result = load_runtime_step_artifacts(payload)

        self.assertFalse(result["feedback_selection"]["selected"])
        self.assertIsNone(result["feedback_selection"]["feedback_id"])
        self.assertEqual(result["promotion_analysis"]["status"], "not_evaluated")
        self.assertFalse(result["provenance"]["disclosure_present"])

    def test_load_runtime_step_artifacts_rejects_missing_top_level_block_members(self) -> None:
        payload = {
            "schema_version": "1.0",
            "provenance": {
                "route_mode": "local",
                "route_status": "selected",
                "route_reason_code": "local_policy_default",
                "fallback_used": False,
                "fallback_refused": False,
                "disclosure_level": "none",
                "disclosure_mentions_external_help": False,
                "disclosure_present": False,
            },
            "promotion_analysis": {
                "status": "not_evaluated",
                "decision": None,
                "reason": "No matching feedback was selected for promotion evaluation.",
                "provenance_warning": False,
                "blocking_signal_type": None,
                "supporting_signal_used": False,
                "audit_summary": "decision=not_evaluated; signal=none",
            },
        }

        with self.assertRaises(ValueError):
            load_runtime_step_artifacts(payload)

    def test_load_runtime_step_artifacts_rejects_caller_authored_route_event_dependency(self) -> None:
        payload = {
            "schema_version": "1.0",
            "route_event": {"event_id": "caller-authored"},
            "provenance": {
                "route_mode": "local",
                "route_status": "selected",
                "route_reason_code": "local_policy_default",
                "fallback_used": False,
                "fallback_refused": False,
                "disclosure_level": "none",
                "disclosure_mentions_external_help": False,
                "disclosure_present": False,
            },
            "feedback_selection": {
                "selected": False,
                "feedback_id": None,
                "target": None,
                "scope_requested": None,
                "promotion_status": None,
                "provenance": None,
            },
            "promotion_analysis": {
                "status": "not_evaluated",
                "decision": None,
                "reason": "No matching feedback was selected for promotion evaluation.",
                "provenance_warning": False,
                "blocking_signal_type": None,
                "supporting_signal_used": False,
                "audit_summary": "decision=not_evaluated; signal=none",
            },
        }

        with self.assertRaises(ValueError):
            load_runtime_step_artifacts(payload)


class PrecedenceTests(unittest.TestCase):
    def test_active_spec_wins_over_feedback_and_default(self) -> None:
        ts = base_truth_surface()
        ts["active_spec"] = {"resolved_rules": {"routing.prefer_local": True}}
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_text": "Use external help if it is faster.",
                "target": "routing.prefer_local",
            }
        ]

        result = resolve_precedence("routing.prefer_local", ts, default=False)

        self.assertEqual(result["winner_source"], "active_spec")
        self.assertTrue(result["winner_value"])

    def test_latest_matching_feedback_wins_when_spec_is_silent(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-old",
                "feedback_text": "keep it glossy",
                "target": "design",
            },
            {
                **base_feedback(),
                "feedback_id": "f-new",
                "feedback_text": "less glossy",
                "target": "design",
            },
        ]

        result = resolve_precedence("design", ts, default="neutral")

        self.assertEqual(result["winner_source"], "explicit_feedback")
        self.assertEqual(result["winner_value"], "less glossy")

    def test_superseded_project_preference_is_ignored(self) -> None:
        ts = base_truth_surface()
        ts["active_project_preferences"] = [
            {
                "preference_id": "pref-stale",
                "rule": "design.dark_mode",
                "scope": "project",
                "confidence": 0.9,
                "evidence_count": 4,
                "last_confirmed_at": "2026-03-20T18:30:00Z",
                "conflict_status": "superseded",
                "origin_feedback_ids": ["fb-101"],
                "provenance_level": "local-proven",
            }
        ]

        result = resolve_precedence("design.dark_mode", ts, default="light")

        self.assertEqual(result["winner_source"], "default")
        self.assertEqual(result["winner_value"], "light")

    def test_active_project_preference_beats_owner_preference(self) -> None:
        ts = base_truth_surface()
        ts["active_project_preferences"] = [
            {
                "preference_id": "pref-project",
                "rule": "teaching.more_explanatory",
                "scope": "project",
                "confidence": 0.9,
                "evidence_count": 3,
                "last_confirmed_at": "2026-03-20T18:30:00Z",
                "conflict_status": "active",
                "origin_feedback_ids": ["fb-101"],
                "provenance_level": "local-proven",
            }
        ]
        ts["active_owner_preferences"] = [
            {
                "preference_id": "pref-owner",
                "rule": "teaching.minimal",
                "scope": "owner",
                "confidence": 0.7,
                "evidence_count": 5,
                "last_confirmed_at": "2026-03-20T18:00:00Z",
                "conflict_status": "active",
                "origin_feedback_ids": ["fb-050"],
                "provenance_level": "hybrid-proven",
            }
        ]

        result = resolve_precedence("teaching.more_explanatory", ts, default="neutral")

        self.assertEqual(result["winner_source"], "project_preference")
        self.assertEqual(result["winner_value"], "teaching.more_explanatory")


class PromotionTests(unittest.TestCase):
    def test_external_only_feedback_sets_provenance_warning(self) -> None:
        result = evaluate_feedback_promotion(
            {**base_feedback(), "provenance": "external-only"},
            project_repeat_count=2,
        )

        self.assertEqual(result["decision"], "project")
        self.assertTrue(result["provenance_warning"])

    def test_unsafe_feedback_is_rejected_even_with_repeat_counts(self) -> None:
        result = evaluate_feedback_promotion(
            base_feedback(),
            project_repeat_count=5,
            cross_project_repeat_count=3,
            explicit_durable=True,
            safe_to_learn=False,
        )

        self.assertEqual(result["decision"], "reject")

    def test_behavioral_repair_signal_blocks_promotion(self) -> None:
        result = evaluate_feedback_promotion(
            base_feedback(),
            project_repeat_count=5,
            behavior_signals=[
                {
                    "signal_id": "sig-repair-1",
                    "timestamp": "2026-03-20T00:05:00Z",
                    "target": "design",
                    "signal_type": "user_repair",
                    "strength": 0.9,
                    "applied_to": "x",
                    "source_route": "local",
                    "notes": "User manually simplified the hero after generation.",
                }
            ],
        )

        self.assertEqual(result["decision"], "reject")
        self.assertIn("repair", result["reason"].lower())
        self.assertEqual(result["blocking_signal_type"], "user_repair")
        self.assertFalse(result["supporting_signal_used"])

    def test_behavioral_non_adoption_signal_blocks_promotion(self) -> None:
        result = evaluate_feedback_promotion(
            base_feedback(),
            project_repeat_count=5,
            behavior_signals=[
                {
                    "signal_id": "sig-skip-1",
                    "timestamp": "2026-03-20T00:05:00Z",
                    "target": "design",
                    "signal_type": "suggestion_not_adopted",
                    "strength": 0.8,
                    "applied_to": "x",
                    "source_route": "hybrid",
                    "notes": "Suggested treatment was not carried forward.",
                }
            ],
        )

        self.assertEqual(result["decision"], "reject")
        self.assertIn("not adopted", result["reason"].lower())
        self.assertEqual(result["blocking_signal_type"], "suggestion_not_adopted")
        self.assertFalse(result["supporting_signal_used"])

    def test_accepted_without_edit_can_support_project_promotion(self) -> None:
        result = evaluate_feedback_promotion(
            base_feedback(),
            project_repeat_count=1,
            behavior_signals=[
                {
                    "signal_id": "sig-accept-1",
                    "timestamp": "2026-03-20T00:05:00Z",
                    "target": "design",
                    "signal_type": "accepted_without_edit",
                    "strength": 0.85,
                    "applied_to": "x",
                    "source_route": "local",
                    "notes": "User accepted the generated treatment without edits.",
                }
            ],
        )

        self.assertEqual(result["decision"], "project")
        self.assertIn("accepted", result["reason"].lower())
        self.assertIsNone(result["blocking_signal_type"])
        self.assertTrue(result["supporting_signal_used"])

    def test_accepted_without_edit_does_not_override_safety_or_negative_evidence(self) -> None:
        result = evaluate_feedback_promotion(
            base_feedback(),
            project_repeat_count=1,
            safe_to_learn=False,
            behavior_signals=[
                {
                    "signal_id": "sig-accept-1",
                    "timestamp": "2026-03-20T00:05:00Z",
                    "target": "design",
                    "signal_type": "accepted_without_edit",
                    "strength": 0.95,
                    "applied_to": "x",
                    "source_route": "local",
                    "notes": "User accepted the generated treatment without edits.",
                },
                {
                    "signal_id": "sig-repair-1",
                    "timestamp": "2026-03-20T00:06:00Z",
                    "target": "design",
                    "signal_type": "user_repair",
                    "strength": 0.95,
                    "applied_to": "x",
                    "source_route": "local",
                    "notes": "User later repaired the generated treatment.",
                },
            ],
        )

        self.assertEqual(result["decision"], "reject")
        self.assertIsNone(result["blocking_signal_type"])
        self.assertFalse(result["supporting_signal_used"])

    def test_blocking_signal_still_wins_when_acceptance_signal_is_present(self) -> None:
        result = evaluate_feedback_promotion(
            base_feedback(),
            project_repeat_count=1,
            behavior_signals=[
                {
                    "signal_id": "sig-accept-1",
                    "timestamp": "2026-03-20T00:05:00Z",
                    "target": "design",
                    "signal_type": "accepted_without_edit",
                    "strength": 0.95,
                    "applied_to": "x",
                    "source_route": "local",
                    "notes": "User accepted the generated treatment without edits.",
                },
                {
                    "signal_id": "sig-repair-1",
                    "timestamp": "2026-03-20T00:06:00Z",
                    "target": "design",
                    "signal_type": "user_repair",
                    "strength": 0.95,
                    "applied_to": "x",
                    "source_route": "local",
                    "notes": "User later repaired the generated treatment.",
                },
            ],
        )

        self.assertEqual(result["decision"], "reject")
        self.assertIn("repair", result["reason"].lower())
        self.assertEqual(result["blocking_signal_type"], "user_repair")
        self.assertTrue(result["supporting_signal_used"])

    def test_local_only_result_reports_no_behavioral_audit_flags(self) -> None:
        result = evaluate_feedback_promotion(base_feedback())

        self.assertEqual(result["decision"], "local-only")
        self.assertIsNone(result["blocking_signal_type"])
        self.assertFalse(result["supporting_signal_used"])


class PromotionAuditFormatterTests(unittest.TestCase):
    def test_formats_blocked_promotion_audit(self) -> None:
        summary = format_promotion_audit(
            {
                "decision": "reject",
                "reason": "Feedback should not be promoted because the user had to repair the resulting work after application.",
                "provenance_warning": False,
                "blocking_signal_type": "user_repair",
                "supporting_signal_used": False,
            }
        )

        self.assertIn("reject", summary)
        self.assertIn("user_repair", summary)

    def test_formats_supported_project_promotion_audit(self) -> None:
        summary = format_promotion_audit(
            {
                "decision": "project",
                "reason": "Feedback can promote project-wide because it repeated and was accepted without edit in practice.",
                "provenance_warning": False,
                "blocking_signal_type": None,
                "supporting_signal_used": True,
            }
        )

        self.assertIn("project", summary)
        self.assertIn("accepted_without_edit", summary)

    def test_formats_neutral_local_only_audit(self) -> None:
        summary = format_promotion_audit(
            {
                "decision": "local-only",
                "reason": "Feedback should affect the current unit but lacks evidence for broader promotion.",
                "provenance_warning": False,
                "blocking_signal_type": None,
                "supporting_signal_used": False,
            }
        )

        self.assertIn("local-only", summary)
        self.assertIn("no_behavioral_signal", summary)


class DisclosureTests(unittest.TestCase):
    def test_route_formatter_reports_local_path_without_external_help(self) -> None:
        route = {
            "mode": "local",
            "status": "selected",
            "reason": "Routine work stays local under the route policy.",
            "reason_code": "local_policy_default",
            "fallback_allowed": True,
            "fallback_used": False,
            "fallback_refused": False,
            "refusal": None,
        }

        result = format_route_disclosure(route)

        self.assertEqual(result["level"], "brief")
        self.assertEqual(result["route_mode"], "local")
        self.assertEqual(result["status"], "selected")
        self.assertFalse(result["mention_external_help"])
        self.assertIn("local path", result["text"].lower())

    def test_route_formatter_reports_hybrid_path_with_external_help(self) -> None:
        route = {
            "mode": "hybrid",
            "status": "selected",
            "reason": "Truth-surface policy allows hybrid support for high-complexity work.",
            "reason_code": "quality_support_needed",
            "fallback_allowed": True,
            "fallback_used": True,
            "fallback_refused": False,
            "refusal": None,
        }

        result = format_route_disclosure(route)

        self.assertEqual(result["level"], "explicit")
        self.assertEqual(result["route_mode"], "hybrid")
        self.assertEqual(result["status"], "selected")
        self.assertTrue(result["mention_external_help"])
        self.assertIn("external help", result["text"].lower())

    def test_route_formatter_reports_governed_refusal_without_claiming_external_execution(self) -> None:
        route = {
            "mode": "refused",
            "status": "refused",
            "reason": "Truth-surface policy forbids external fallback for this local-only task.",
            "reason_code": "fallback_disallowed",
            "fallback_allowed": False,
            "fallback_used": False,
            "fallback_refused": True,
            "refusal": {
                "kind": "policy_refusal",
                "message": "External fallback is not permitted for this task.",
                "learned_effect_allowed": False,
            },
        }

        result = format_route_disclosure(route)

        self.assertEqual(result["level"], "brief")
        self.assertEqual(result["route_mode"], "refused")
        self.assertEqual(result["status"], "refused")
        self.assertFalse(result["mention_external_help"])
        self.assertIn("refused", result["text"].lower())
        self.assertNotIn("used external help", result["text"].lower())

    def test_hybrid_route_requires_explicit_disclosure(self) -> None:
        event = {
            "event_id": "e1",
            "provider": "p",
            "model": "m",
            "mode": "hybrid",
            "route_reason": "quality support",
            "fallback_used": True,
            "fallback_refused": False,
            "learned_effect_allowed": True,
        }

        result = format_provenance_disclosure(event)

        self.assertEqual(result["level"], "explicit")
        self.assertTrue(result["mention_external_help"])

    def test_fallback_refusal_stays_brief_and_non_external(self) -> None:
        event = {
            "event_id": "e2",
            "provider": "p",
            "model": "m",
            "mode": "local",
            "route_reason": "policy lock",
            "fallback_used": False,
            "fallback_refused": True,
            "learned_effect_allowed": False,
        }

        result = format_provenance_disclosure(event)

        self.assertEqual(result["level"], "brief")
        self.assertFalse(result["mention_external_help"])


class RuntimeRouteDecisionContractTests(unittest.TestCase):
    def test_route_decision_parser_accepts_local_mode_payload(self) -> None:
        payload = {
            "mode": "local",
            "status": "selected",
            "reason": "Local-first policy keeps this routine task on the local path.",
            "reason_code": "local_policy_default",
            "fallback_allowed": True,
            "fallback_used": False,
            "fallback_refused": False,
            "refusal": None,
        }

        result = load_route_decision_result(payload)

        self.assertEqual(result["mode"], "local")
        self.assertEqual(result["status"], "selected")
        self.assertFalse(result["fallback_used"])
        self.assertIsNone(result["refusal"])

    def test_route_decision_parser_rejects_missing_refusal_fields(self) -> None:
        payload = {
            "mode": "refused",
            "status": "refused",
            "reason": "Fallback is disallowed for this local-only task.",
            "reason_code": "fallback_disallowed",
            "fallback_allowed": False,
            "fallback_used": False,
            "fallback_refused": True,
        }

        with self.assertRaises(ValueError):
            load_route_decision_result(payload)

    def test_route_decision_contract_represents_local_hybrid_and_refused_outcomes(self) -> None:
        local_result = load_route_decision_result(
            {
                "mode": "local",
                "status": "selected",
                "reason": "Routine work stays local under the route policy.",
                "reason_code": "local_policy_default",
                "fallback_allowed": True,
                "fallback_used": False,
                "fallback_refused": False,
                "refusal": None,
            }
        )
        hybrid_result = load_route_decision_result(
            {
                "mode": "hybrid",
                "status": "selected",
                "reason": "Truth-surface policy allows hybrid support for high-complexity work.",
                "reason_code": "quality_support_needed",
                "fallback_allowed": True,
                "fallback_used": True,
                "fallback_refused": False,
                "refusal": None,
            }
        )
        refused_result = load_route_decision_result(
            {
                "mode": "refused",
                "status": "refused",
                "reason": "Truth-surface policy forbids external fallback for this local-only task.",
                "reason_code": "fallback_disallowed",
                "fallback_allowed": False,
                "fallback_used": False,
                "fallback_refused": True,
                "refusal": {
                    "kind": "policy_refusal",
                    "message": "External fallback is not permitted for this task.",
                    "learned_effect_allowed": False,
                },
            }
        )

        self.assertEqual(local_result["mode"], "local")
        self.assertEqual(hybrid_result["mode"], "hybrid")
        self.assertTrue(hybrid_result["fallback_used"])
        self.assertEqual(refused_result["mode"], "refused")
        self.assertEqual(refused_result["status"], "refused")
        self.assertEqual(refused_result["refusal"]["kind"], "policy_refusal")
        self.assertFalse(refused_result["refusal"]["learned_effect_allowed"])

    def test_truth_surface_examples_cover_local_hybrid_and_refused_route_inputs(self) -> None:
        local_truth_surface = load_truth_surface(base_truth_surface())
        hybrid_truth_surface = load_truth_surface(
            {
                **base_truth_surface(),
                "routing_policy": {
                    "default_mode": "local",
                    "high_complexity_allows_hybrid": True,
                },
                "current_task": {
                    "task_id": "task-hybrid",
                    "phase": "generation",
                    "target_outcome": "Complex generation task needing broader capability.",
                    "complexity": "high",
                },
                "fallback_policy": {
                    "must_disclose_material_external_help": True,
                    "refuse_on_local_only_tasks": False,
                },
            }
        )
        refused_truth_surface = load_truth_surface(
            {
                **base_truth_surface(),
                "routing_policy": {
                    "default_mode": "local",
                    "high_complexity_allows_hybrid": False,
                },
                "current_task": {
                    "task_id": "task-refused",
                    "phase": "generation",
                    "target_outcome": "Local-only task that forbids fallback.",
                    "local_only": True,
                },
                "fallback_policy": {
                    "must_disclose_material_external_help": True,
                    "refuse_on_local_only_tasks": True,
                },
            }
        )

        self.assertEqual(local_truth_surface["routing_policy"], {})
        self.assertTrue(hybrid_truth_surface["routing_policy"]["high_complexity_allows_hybrid"])
        self.assertTrue(refused_truth_surface["fallback_policy"]["refuse_on_local_only_tasks"])


class RuntimeStepTests(unittest.TestCase):
    def test_runtime_step_composes_runtime_owned_route_disclosure_and_promotion(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-runtime",
                "feedback_text": "less glossy",
                "target": "design",
            }
        ]
        ts["routing_policy"] = {
            "default_mode": "local",
            "high_complexity_allows_hybrid": True,
        }
        ts["current_task"] = {
            "task_id": "task-hybrid-runtime",
            "phase": "generation",
            "target_outcome": "Complex generation task needing broader capability.",
            "complexity": "high",
        }
        ts["fallback_policy"] = {
            "must_disclose_material_external_help": True,
            "refuse_on_local_only_tasks": False,
        }

        result = resolve_runtime_step(
            "design",
            ts,
            default="neutral",
            evaluate_promotion=True,
            project_repeat_count=2,
        )

        self.assertEqual(result["precedence"]["winner_source"], "explicit_feedback")
        self.assertEqual(result["route"]["mode"], "hybrid")
        self.assertEqual(result["route"]["status"], "selected")
        self.assertTrue(result["route"]["fallback_used"])
        self.assertEqual(result["disclosure"]["level"], "explicit")
        self.assertEqual(result["promotion"]["decision"], "project")
        self.assertIsNone(result["promotion"]["blocking_signal_type"])
        self.assertFalse(result["promotion"]["supporting_signal_used"])

    def test_runtime_step_derives_local_route_without_caller_authored_route_event(self) -> None:
        ts = base_truth_surface()

        result = resolve_runtime_step(
            "routing.prefer_local",
            ts,
            default=True,
        )

        self.assertEqual(result["route"]["mode"], "local")
        self.assertEqual(result["route"]["status"], "selected")
        self.assertFalse(result["route"]["fallback_used"])
        self.assertFalse(result["route"]["fallback_refused"])
        self.assertIsNone(result["route"]["refusal"])
        self.assertNotIn("disclosure", result)

    def test_runtime_step_derives_refused_route_from_truth_surface_inputs(self) -> None:
        ts = base_truth_surface()
        ts["routing_policy"] = {
            "default_mode": "local",
            "high_complexity_allows_hybrid": True,
        }
        ts["current_task"] = {
            "task_id": "task-refused-runtime",
            "phase": "generation",
            "target_outcome": "Local-only task that forbids fallback.",
            "complexity": "high",
            "local_only": True,
        }
        ts["fallback_policy"] = {
            "must_disclose_material_external_help": True,
            "refuse_on_local_only_tasks": True,
        }

        result = resolve_runtime_step(
            "routing.prefer_local",
            ts,
            default=True,
        )

        self.assertEqual(result["route"]["mode"], "refused")
        self.assertEqual(result["route"]["status"], "refused")
        self.assertFalse(result["route"]["fallback_allowed"])
        self.assertTrue(result["route"]["fallback_refused"])
        self.assertEqual(result["route"]["refusal"]["kind"], "policy_refusal")
        self.assertEqual(result["disclosure"]["level"], "brief")

    def test_runtime_step_ignores_contradictory_caller_route_event_for_disclosure_truth(self) -> None:
        ts = base_truth_surface()
        ts["routing_policy"] = {
            "default_mode": "local",
            "high_complexity_allows_hybrid": True,
        }
        ts["current_task"] = {
            "task_id": "task-hybrid-contradiction",
            "phase": "generation",
            "target_outcome": "Complex generation task needing broader capability.",
            "complexity": "high",
        }
        ts["fallback_policy"] = {
            "must_disclose_material_external_help": True,
            "refuse_on_local_only_tasks": False,
        }

        contradictory_event = {
            "event_id": "caller-claims-local",
            "provider": "caller",
            "model": "manual",
            "mode": "local",
            "route_reason": "Caller-authored contradiction",
            "fallback_used": False,
            "fallback_refused": False,
            "learned_effect_allowed": True,
        }

        result = resolve_runtime_step(
            "design",
            ts,
            default="neutral",
            route_event=contradictory_event,
        )

        self.assertEqual(result["route"]["mode"], "hybrid")
        self.assertEqual(result["disclosure"]["route_mode"], "hybrid")
        self.assertTrue(result["disclosure"]["mention_external_help"])
        self.assertIn("external help", result["disclosure"]["text"].lower())
        self.assertNotIn("caller-authored contradiction", result["disclosure"]["text"].lower())

    def test_runtime_step_emits_empty_artifacts_when_feedback_absent(self) -> None:
        ts = base_truth_surface()

        result = resolve_runtime_step(
            "routing.prefer_local",
            ts,
            default=True,
            evaluate_promotion=True,
        )

        artifacts = result["artifacts"]

        self.assertEqual(result["precedence"]["winner_source"], "default")
        self.assertNotIn("promotion", result)
        self.assertEqual(artifacts["provenance"]["route_mode"], result["route"]["mode"])
        self.assertEqual(artifacts["provenance"]["route_status"], result["route"]["status"])
        self.assertEqual(artifacts["provenance"]["route_reason_code"], result["route"]["reason_code"])
        self.assertFalse(artifacts["provenance"]["disclosure_present"])
        self.assertEqual(artifacts["provenance"]["disclosure_level"], "none")
        self.assertFalse(artifacts["feedback_selection"]["selected"])
        self.assertIsNone(artifacts["feedback_selection"]["feedback_id"])
        self.assertEqual(artifacts["promotion_analysis"]["status"], "not_evaluated")
        self.assertIsNone(artifacts["promotion_analysis"]["decision"])
        self.assertEqual(
            artifacts["promotion_analysis"]["reason"],
            "No matching feedback was selected for promotion evaluation.",
        )

    def test_runtime_step_uses_selected_feedback_for_promotion_instead_of_last_entry(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-relevant",
                "feedback_text": "less glossy",
                "scope_requested": "turn",
                "target": "design",
                "promotion_status": "local-only",
                "provenance": "not-yet-proven",
            },
            {
                **base_feedback(),
                "feedback_id": "f-last-but-irrelevant",
                "feedback_text": "teach more",
                "scope_requested": "turn",
                "target": "teaching",
                "promotion_status": "local-only",
                "provenance": "external-only",
            },
        ]

        result = resolve_runtime_step(
            "design",
            ts,
            default="neutral",
            evaluate_promotion=True,
            project_repeat_count=2,
        )

        artifacts = result["artifacts"]

        self.assertEqual(result["precedence"]["winner_source"], "explicit_feedback")
        self.assertEqual(result["precedence"]["winner_value"], "less glossy")
        self.assertTrue(artifacts["feedback_selection"]["selected"])
        self.assertEqual(artifacts["feedback_selection"]["feedback_id"], "f-relevant")
        self.assertEqual(artifacts["feedback_selection"]["target"], "design")
        self.assertEqual(artifacts["feedback_selection"]["scope_requested"], "turn")
        self.assertEqual(artifacts["feedback_selection"]["promotion_status"], "local-only")
        self.assertEqual(artifacts["feedback_selection"]["provenance"], "not-yet-proven")
        self.assertEqual(result["promotion"]["decision"], "project")
        self.assertEqual(artifacts["promotion_analysis"]["status"], "evaluated")
        self.assertEqual(artifacts["promotion_analysis"]["decision"], result["promotion"]["decision"])
        self.assertEqual(artifacts["promotion_analysis"]["reason"], result["promotion"]["reason"])
        self.assertFalse(result["promotion"]["provenance_warning"])
        self.assertIsNone(result["promotion"]["blocking_signal_type"])
        self.assertFalse(result["promotion"]["supporting_signal_used"])

    def test_runtime_step_omits_promotion_when_only_irrelevant_feedback_exists(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-teaching-only",
                "target": "teaching",
                "feedback_text": "teach more",
            }
        ]

        result = resolve_runtime_step(
            "design",
            ts,
            default="neutral",
            evaluate_promotion=True,
        )

        self.assertEqual(result["precedence"]["winner_source"], "default")
        self.assertNotIn("promotion", result)

    def test_runtime_step_blocks_promotion_when_behavioral_signal_shows_user_repair(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-runtime",
                "feedback_text": "less glossy",
                "target": "design",
            }
        ]
        ts["recent_behavior_signals"] = [
            {
                "signal_id": "sig-runtime-repair",
                "timestamp": "2026-03-20T00:05:00Z",
                "target": "design",
                "signal_type": "user_repair",
                "strength": 0.95,
                "applied_to": "x",
                "source_route": "local",
                "notes": "User manually corrected the generated treatment.",
            }
        ]

        result = resolve_runtime_step(
            "design",
            ts,
            default="neutral",
            evaluate_promotion=True,
            project_repeat_count=3,
        )

        artifacts = result["artifacts"]

        self.assertEqual(result["precedence"]["winner_source"], "explicit_feedback")
        self.assertEqual(result["promotion"]["decision"], "reject")
        self.assertEqual(result["promotion"]["blocking_signal_type"], "user_repair")
        self.assertFalse(result["promotion"]["supporting_signal_used"])
        self.assertEqual(artifacts["promotion_analysis"]["status"], "evaluated")
        self.assertEqual(artifacts["promotion_analysis"]["decision"], "reject")
        self.assertEqual(artifacts["promotion_analysis"]["blocking_signal_type"], "user_repair")
        self.assertFalse(artifacts["promotion_analysis"]["supporting_signal_used"])
        self.assertIn("user_repair", artifacts["promotion_analysis"]["audit_summary"])

    def test_runtime_step_artifacts_follow_runtime_owned_disclosure_truth_not_caller_route_event(self) -> None:
        ts = base_truth_surface()
        ts["routing_policy"] = {
            "default_mode": "local",
            "high_complexity_allows_hybrid": True,
        }
        ts["current_task"] = {
            "task_id": "task-hybrid-artifacts",
            "phase": "generation",
            "target_outcome": "Complex generation task needing broader capability.",
            "complexity": "high",
        }
        ts["fallback_policy"] = {
            "must_disclose_material_external_help": True,
            "refuse_on_local_only_tasks": False,
        }

        contradictory_event = {
            "event_id": "caller-claims-local",
            "provider": "caller",
            "model": "manual",
            "mode": "local",
            "route_reason": "Caller-authored contradiction",
            "fallback_used": False,
            "fallback_refused": False,
            "learned_effect_allowed": True,
        }

        result = resolve_runtime_step(
            "design",
            ts,
            default="neutral",
            route_event=contradictory_event,
            evaluate_promotion=True,
        )

        artifacts = result["artifacts"]

        self.assertEqual(result["route"]["mode"], "hybrid")
        self.assertEqual(artifacts["provenance"]["route_mode"], "hybrid")
        self.assertEqual(artifacts["provenance"]["route_status"], result["route"]["status"])
        self.assertEqual(artifacts["provenance"]["route_reason_code"], result["route"]["reason_code"])
        self.assertTrue(artifacts["provenance"]["disclosure_present"])
        self.assertEqual(artifacts["provenance"]["disclosure_level"], result["disclosure"]["level"])
        self.assertTrue(artifacts["provenance"]["disclosure_mentions_external_help"])
        self.assertEqual(artifacts["promotion_analysis"]["status"], "not_evaluated")

    def test_runtime_step_reports_supporting_acceptance_audit_fields(self) -> None:
        ts = base_truth_surface()
        ts["recent_explicit_feedback"] = [
            {
                **base_feedback(),
                "feedback_id": "f-runtime-accept",
                "feedback_text": "less glossy",
                "target": "design",
            }
        ]
        ts["recent_behavior_signals"] = [
            {
                "signal_id": "sig-runtime-accept",
                "timestamp": "2026-03-20T00:05:00Z",
                "target": "design",
                "signal_type": "accepted_without_edit",
                "strength": 0.9,
                "applied_to": "x",
                "source_route": "local",
                "notes": "User accepted the generated treatment without edits.",
            }
        ]

        result = resolve_runtime_step(
            "design",
            ts,
            default="neutral",
            evaluate_promotion=True,
            project_repeat_count=1,
        )

        self.assertEqual(result["promotion"]["decision"], "project")
        self.assertIsNone(result["promotion"]["blocking_signal_type"])
        self.assertTrue(result["promotion"]["supporting_signal_used"])

    def test_runtime_step_demo_example_emits_hybrid_route_with_matching_disclosure(self) -> None:
        truth_surface_path = ROOT / "schemas" / "examples" / "truth-surface.example.json"
        truth_surface = load_truth_surface(json.loads(truth_surface_path.read_text(encoding="utf-8")))

        result = resolve_runtime_step(
            "routing.prefer_local",
            truth_surface,
            default=False,
            evaluate_promotion=True,
            project_repeat_count=2,
        )

        self.assertEqual(result["route"]["mode"], "hybrid")
        self.assertEqual(result["route"]["status"], "selected")
        self.assertTrue(result["route"]["fallback_used"])
        self.assertEqual(result["disclosure"]["route_mode"], result["route"]["mode"])
        self.assertTrue(result["disclosure"]["mention_external_help"])
        self.assertIn("external help", result["disclosure"]["text"].lower())

    def test_runtime_scenarios_script_prints_route_refusal_and_disclosure_restore_points(self) -> None:
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            exit_code = runtime_scenarios.main()

        output = buffer.getvalue()

        self.assertEqual(exit_code, 0)
        self.assertIn("runtime-owned-local-route", output)
        self.assertIn("runtime-owned-hybrid-route", output)
        self.assertIn("runtime-owned-refused-route", output)
        self.assertIn("route.mode=local", output)
        self.assertIn("route.mode=hybrid", output)
        self.assertIn("route.mode=refused", output)
        self.assertIn("refusal.kind=policy_refusal", output)
        self.assertIn("disclosure.text=", output)

    def test_demo_runtime_step_script_prints_matching_route_and_disclosure_surface(self) -> None:
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            exit_code = demo_runtime_step.main()

        output = buffer.getvalue()

        self.assertEqual(exit_code, 0)
        self.assertIn("route mode: hybrid", output)
        self.assertIn("fallback used: True", output)
        self.assertIn("disclosure route mode: hybrid", output)
        self.assertIn("disclosure mentions external help: True", output)
        self.assertIn("refusal kind: none", output)


if __name__ == "__main__":
    unittest.main()
