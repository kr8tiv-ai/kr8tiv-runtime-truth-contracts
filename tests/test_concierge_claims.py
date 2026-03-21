from __future__ import annotations

import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime_types.concierge_claims import derive_concierge_lifecycle
from tools.inspect_concierge_claim import main as inspect_concierge_claim_main


class ConciergeLifecycleTests(unittest.TestCase):
    def test_claimed_but_awaiting_setup_state_exposes_support_safe_guidance(self) -> None:
        result = derive_concierge_lifecycle(
            claim_id="claim-concierge-001",
            claimant_label="demo-owner-cipher",
            claim_submitted=True,
            identity_verified=True,
            device_setup_complete=False,
            owner_confirmation_complete=False,
            support_intervention_required=False,
        )

        self.assertEqual(result["claim_status"], "claimed")
        self.assertEqual(result["setup_stage"], "awaiting_device_setup")
        self.assertIsNone(result["blocking_reason"])
        self.assertIsNone(result["manual_checkpoint"])
        self.assertFalse(result["activation_ready"])
        self.assertEqual(result["next_user_step"], "Complete the device setup steps sent by support.")
        self.assertEqual(result["setup_guidance"]["guidance_status"], "needs_user_action")
        self.assertEqual(result["setup_guidance"]["next_user_step"], "Complete the device setup steps sent by support.")
        self.assertIn("device", result["setup_guidance"]["plain_language_summary"].lower())
        self.assertIn("support", result["setup_guidance"]["support_safe_notes"].lower())

    def test_blocked_state_requires_reason_and_manual_checkpoint(self) -> None:
        result = derive_concierge_lifecycle(
            claim_id="claim-concierge-002",
            claimant_label="demo-owner-catalyst",
            claim_submitted=True,
            identity_verified=False,
            device_setup_complete=False,
            owner_confirmation_complete=False,
            support_intervention_required=True,
        )

        self.assertEqual(result["claim_status"], "blocked")
        self.assertEqual(result["setup_stage"], "support_followup_required")
        self.assertEqual(result["blocking_reason"], "identity_verification_pending")
        self.assertEqual(result["manual_checkpoint"], "await_support_followup")
        self.assertFalse(result["activation_ready"])
        self.assertEqual(result["next_user_step"], "Wait for support to confirm your identity and next steps.")
        self.assertEqual(result["setup_guidance"]["guidance_status"], "blocked")
        self.assertEqual(result["setup_guidance"]["manual_checkpoint"], "await_support_followup")
        self.assertEqual(result["setup_guidance"]["blocking_reason"], "identity_verification_pending")

    def test_activation_ready_state_is_explicit_and_machine_readable(self) -> None:
        result = derive_concierge_lifecycle(
            claim_id="claim-concierge-003",
            claimant_label="demo-owner-forge",
            claim_submitted=True,
            identity_verified=True,
            device_setup_complete=True,
            owner_confirmation_complete=True,
            support_intervention_required=False,
        )

        self.assertEqual(result["claim_status"], "activation_ready")
        self.assertEqual(result["setup_stage"], "setup_complete")
        self.assertIsNone(result["blocking_reason"])
        self.assertIsNone(result["manual_checkpoint"])
        self.assertTrue(result["activation_ready"])
        self.assertEqual(result["next_user_step"], "Reply to support to schedule activation.")
        self.assertEqual(result["setup_guidance"]["guidance_status"], "ready")
        self.assertIn("activation", result["setup_guidance"]["plain_language_summary"].lower())


class ConciergeInspectionScriptTests(unittest.TestCase):
    def test_inspection_output_reports_claimed_blocked_and_ready_states(self) -> None:
        stdout = io.StringIO()
        with patch("sys.stdout", stdout):
            exit_code = inspect_concierge_claim_main()

        output = stdout.getvalue()

        self.assertEqual(exit_code, 0)
        self.assertIn("Concierge claim inspection", output)
        self.assertIn("claim_status=claimed", output)
        self.assertIn("setup_stage=awaiting_device_setup", output)
        self.assertIn("activation_ready=False", output)
        self.assertIn("claim_status=blocked", output)
        self.assertIn("blocking_reason=identity_verification_pending", output)
        self.assertIn("manual_checkpoint=await_support_followup", output)
        self.assertIn("claim_status=activation_ready", output)
        self.assertIn("activation_ready=True", output)
        self.assertIn("next_user_step=Reply to support to schedule activation.", output)


if __name__ == "__main__":
    unittest.main()
