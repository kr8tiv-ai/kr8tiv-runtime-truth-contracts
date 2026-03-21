from __future__ import annotations

import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime_types.design_teaching_research import derive_design_teaching_research_record
from runtime_types.parsers import load_website_specialist_harness_record
from tools.inspect_design_teaching_research import main as inspect_main


def example_payload(name: str) -> dict:
    path = ROOT / "schemas" / "examples" / name
    return json.loads(path.read_text(encoding="utf-8"))


class DesignTeachingResearchDerivationTests(unittest.TestCase):
    def test_derives_local_teaching_record_from_canonical_harness_truth(self) -> None:
        harness = load_website_specialist_harness_record(
            example_payload("website-specialist-harness-record.local-success.example.json")
        )

        record = derive_design_teaching_research_record(
            record_id="derived-local-001",
            harness=harness,
            lesson_focus="Explain why stronger hierarchy and section pacing produce a more intentional website.",
            next_step_guidance="Revise the hero and first supporting section before adding extra visual effects.",
            teaching_requested=True,
            research_requested=False,
        )

        self.assertEqual(record["harness"]["harness_id"], harness["harness_id"])
        self.assertEqual(record["teaching"]["teaching_status"], "available")
        self.assertEqual(record["research"]["research_status"], "local_only")
        self.assertEqual(record["research"]["freshness_label"], "not_applicable")
        self.assertIn("hierarchy", record["teaching"]["lesson_summary"].lower())
        self.assertIn("generic", record["teaching"]["anti_slop_rationale"].lower())
        self.assertIn("no current-reference research", record["research"]["disclosure_text"].lower())

    def test_derives_hybrid_research_record_with_honest_provenance(self) -> None:
        harness = load_website_specialist_harness_record(
            example_payload("website-specialist-harness-record.hybrid-escalation.example.json")
        )

        record = derive_design_teaching_research_record(
            record_id="derived-hybrid-001",
            harness=harness,
            lesson_focus="Explain which structural cues still feel current without telling Cipher to imitate outside references.",
            next_step_guidance="Keep the concept and hierarchy, then selectively refresh only the stale treatments.",
            teaching_requested=True,
            research_requested=True,
            current_reference_summary="Bounded current-reference synthesis highlighted overused visual cues and fresher composition patterns.",
            freshness_label="current",
        )

        self.assertEqual(record["teaching"]["teaching_status"], "available")
        self.assertEqual(record["research"]["research_status"], "hybrid_support")
        self.assertEqual(record["research"]["provenance_mode"], "hybrid")
        self.assertEqual(record["research"]["disclosure_level"], "explicit")
        self.assertIn("hybrid research support", record["research"]["disclosure_text"].lower())
        self.assertIn("current-reference", record["research"]["signal_summary"].lower())
        self.assertIn("trend worship", record["teaching"]["anti_slop_rationale"].lower())

    def test_derives_blocked_suppressed_record_without_teaching_or_live_claims(self) -> None:
        harness = load_website_specialist_harness_record(
            example_payload("website-specialist-harness-record.local-success.example.json")
        )

        record = derive_design_teaching_research_record(
            record_id="derived-blocked-001",
            harness=harness,
            lesson_focus="Do not emit a design lesson when the bounded teaching pass is suppressed.",
            next_step_guidance="Ask for an explicit bounded teaching pass before requesting critique.",
            teaching_requested=False,
            research_requested=True,
            research_blocked_reason="Current-reference research is blocked for this record.",
        )

        self.assertEqual(record["teaching"]["teaching_status"], "suppressed")
        self.assertEqual(record["research"]["research_status"], "blocked")
        self.assertIn("suppressed", record["teaching"]["lesson_summary"].lower())
        self.assertIn("blocked", record["research"]["disclosure_text"].lower())
        self.assertIn("without bluffing", record["support_safe_summary"].lower())


class DesignTeachingResearchCliTests(unittest.TestCase):
    def test_cli_prints_support_safe_restore_point(self) -> None:
        output = io.StringIO()

        with redirect_stdout(output):
            exit_code = inspect_main()

        rendered = output.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn("Design teaching + research inspection", rendered)
        self.assertIn("SCENARIO local_teaching", rendered)
        self.assertIn("SCENARIO hybrid_research", rendered)
        self.assertIn("SCENARIO blocked_or_suppressed", rendered)
        self.assertIn("teaching_status:", rendered)
        self.assertIn("research_status:", rendered)
        self.assertNotIn("raw reference", rendered.lower())
        self.assertNotIn("raw transcript", rendered.lower())
        self.assertNotIn("private memory", rendered.lower())


if __name__ == "__main__":
    unittest.main()
