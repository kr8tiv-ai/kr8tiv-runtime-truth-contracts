from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime_types.concierge_claims import derive_concierge_lifecycle
from runtime_types.parsers import (
    load_cipher_continuity_record,
    load_routing_provenance_event,
    load_telegram_voice_turn,
    load_website_specialist_harness_record,
)
from runtime_types.website_specialist_harness import derive_website_specialist_harness_record


def _load_example(relative_path: str) -> dict:
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


class WebsiteSpecialistHarnessContractTests(unittest.TestCase):
    def test_local_success_example_stays_support_safe_and_local(self) -> None:
        payload = _load_example("schemas/examples/website-specialist-harness-record.local-success.example.json")

        result = load_website_specialist_harness_record(payload)

        self.assertEqual(result["execution"]["route"]["mode"], "local")
        self.assertFalse(result["execution"]["fallback_refused"])
        self.assertIn("cipher_bloodline", result["execution"]["persona_markers"])

    def test_hybrid_escalation_example_discloses_external_help_honestly(self) -> None:
        payload = _load_example("schemas/examples/website-specialist-harness-record.hybrid-escalation.example.json")

        result = load_website_specialist_harness_record(payload)

        self.assertEqual(result["execution"]["route"]["mode"], "hybrid")
        self.assertEqual(result["execution"]["disclosure_level"], "explicit")
        self.assertTrue(result["execution"]["route"]["fallback_used"])


class WebsiteSpecialistHarnessDerivationTests(unittest.TestCase):
    def test_derives_local_success_from_canonical_upstream_records(self) -> None:
        lifecycle = derive_concierge_lifecycle(
            claim_id="claim-concierge-001",
            claimant_label="demo-owner-cipher",
            claim_submitted=True,
            identity_verified=True,
            device_setup_complete=True,
            owner_confirmation_complete=True,
            support_intervention_required=False,
        )
        voice_turn = load_telegram_voice_turn(
            {
                "voice_turn_id": "tg-turn-ready-001",
                "platform": "telegram",
                "chat_id": "tg-chat-1001",
                "user_id": "tg-user-88",
                "voice_message_id": "tg-voice-msg-42",
                "voice_turn_status": "activation_ready",
                "activation_gate_status": "ready",
                "blocked_reason": None,
                "support_safe_status_summary": "Activation is ready and the owner received a voiced next-step reply.",
                "inbound_voice_note": {
                    "telegram_file_id": "file_abc123",
                    "telegram_file_unique_id": "unique_abc123",
                    "audio_duration_seconds": 21,
                    "mime_type": "audio/ogg",
                    "message_timestamp": "2026-03-21T12:00:00Z",
                    "source": "telegram_voice_note",
                },
                "transcript": {
                    "transcript_status": "available",
                    "transcript_language": "en",
                    "transcript_summary": "Owner asked Cipher to continue with a website update after activation confirmation.",
                    "intent_summary": "Continue with a website update once activation is ready.",
                    "confidence_label": "high",
                    "redaction_level": "support_safe_summary_only",
                },
                "reply": {
                    "reply_status": "voiced",
                    "delivery_channel": "telegram_voice_note",
                    "voice_style": "concierge_warm",
                    "reply_summary": "Confirms readiness and continues the support-safe website handoff.",
                    "audio_duration_seconds": 18,
                    "contains_action_prompt": True,
                },
                "continuity": {
                    "continuity_status": "carryover",
                    "session_reference": "tg-session-042",
                    "turns_in_session": 3,
                    "carryover_summary": "Continues the same activation thread from the owner's earlier voice note.",
                    "prior_turn_reference": "tg-turn-041",
                    "memory_scope": "support_safe_carryover",
                },
            }
        )
        continuity = load_cipher_continuity_record(
            _load_example("schemas/examples/cipher-continuity-record.carryover.example.json")
        )
        route = load_routing_provenance_event(
            {
                "event_id": "route-local-success-001",
                "provider": "local-runtime",
                "model": "llama-local",
                "mode": "local",
                "route_reason": "Local website specialist completed the request without external help.",
                "fallback_used": False,
                "fallback_refused": False,
                "learned_effect_allowed": True,
            }
        )

        result = derive_website_specialist_harness_record(
            harness_id="ws-harness-local-success-derived-001",
            request_id="ws-request-local-success-derived-001",
            execution_id="ws-execution-local-success-derived-001",
            lifecycle=lifecycle,
            voice_turn=voice_turn,
            continuity=continuity,
            route_event=route,
            requested_capability="website_update",
            request_source="telegram_voice_turn",
            support_safe_request_summary="Owner asked Cipher to continue with a website update once activation was confirmed.",
            desired_outcome_summary="Handle the website-specialist step locally while preserving route honesty and bounded continuity markers.",
        )

        self.assertEqual(result["request"]["request_status"], "activation_ready")
        self.assertEqual(result["execution"]["route"]["mode"], "local")
        self.assertEqual(result["execution"]["disclosure_level"], "brief")
        self.assertEqual(result["execution"]["specialist_status"], "completed")
        self.assertEqual(result["execution"]["task_phase"], "fulfilled")
        self.assertIn("cipher_bloodline", result["execution"]["persona_markers"])
        self.assertIn("carryover_callback", result["execution"]["spoken_manner_markers"])
        self.assertIn("tg-session-042", result["execution"]["continuity_carryover_refs"])
        self.assertEqual(result["activation_handoff_status"], "handoff_complete")

    def test_derives_hybrid_escalation_with_explicit_disclosure(self) -> None:
        lifecycle = derive_concierge_lifecycle(
            claim_id="claim-concierge-001",
            claimant_label="demo-owner-cipher",
            claim_submitted=True,
            identity_verified=True,
            device_setup_complete=True,
            owner_confirmation_complete=True,
            support_intervention_required=False,
        )
        voice_turn = load_telegram_voice_turn(
            {
                "voice_turn_id": "tg-turn-ready-001",
                "platform": "telegram",
                "chat_id": "tg-chat-1001",
                "user_id": "tg-user-88",
                "voice_message_id": "tg-voice-msg-42",
                "voice_turn_status": "activation_ready",
                "activation_gate_status": "ready",
                "blocked_reason": None,
                "support_safe_status_summary": "Activation is ready and the owner received a voiced next-step reply.",
                "inbound_voice_note": {
                    "telegram_file_id": "file_abc123",
                    "telegram_file_unique_id": "unique_abc123",
                    "audio_duration_seconds": 21,
                    "mime_type": "audio/ogg",
                    "message_timestamp": "2026-03-21T12:00:00Z",
                    "source": "telegram_voice_note",
                },
                "transcript": {
                    "transcript_status": "available",
                    "transcript_language": "en",
                    "transcript_summary": "Owner asked Cipher for a website diagnostic review.",
                    "intent_summary": "Request a website diagnostic review that may need hybrid help.",
                    "confidence_label": "high",
                    "redaction_level": "support_safe_summary_only",
                },
                "reply": {
                    "reply_status": "voiced",
                    "delivery_channel": "telegram_voice_note",
                    "voice_style": "concierge_warm",
                    "reply_summary": "Confirms readiness and continues the support-safe website handoff.",
                    "audio_duration_seconds": 18,
                    "contains_action_prompt": True,
                },
                "continuity": {
                    "continuity_status": "same_session",
                    "session_reference": "tg-session-042",
                    "turns_in_session": 2,
                    "carryover_summary": "Continues the same activation thread after support confirmed the final checkpoint.",
                    "prior_turn_reference": "tg-turn-041",
                    "memory_scope": "session_only",
                },
            }
        )
        continuity = load_cipher_continuity_record(
            _load_example("schemas/examples/cipher-continuity-record.activation-ready.example.json")
        )
        route = load_routing_provenance_event(
            {
                "event_id": "route-hybrid-escalation-001",
                "provider": "hybrid-runtime",
                "model": "mixtral-support",
                "mode": "hybrid",
                "route_reason": "Local specialist required bounded hybrid help for the diagnostic review.",
                "fallback_used": True,
                "fallback_refused": False,
                "learned_effect_allowed": False,
            }
        )

        result = derive_website_specialist_harness_record(
            harness_id="ws-harness-hybrid-derived-001",
            request_id="ws-request-hybrid-derived-001",
            execution_id="ws-execution-hybrid-derived-001",
            lifecycle=lifecycle,
            voice_turn=voice_turn,
            continuity=continuity,
            route_event=route,
            requested_capability="diagnostic_review",
            request_source="telegram_voice_turn",
            support_safe_request_summary="Owner requested a website diagnostic review that may need hybrid help to complete safely.",
            desired_outcome_summary="Escalate the specialist route honestly if local-only coverage is insufficient while keeping bounded continuity markers.",
        )

        self.assertEqual(result["request"]["request_status"], "needs_route_decision")
        self.assertEqual(result["execution"]["specialist_status"], "escalated")
        self.assertEqual(result["execution"]["task_phase"], "routing")
        self.assertEqual(result["execution"]["disclosure_level"], "explicit")
        self.assertTrue(result["execution"]["route"]["fallback_used"])
        self.assertIn("hybrid", result["execution"]["disclosure_text"].lower())
        self.assertEqual(result["activation_handoff_status"], "activation_ready")

    def test_blocked_activation_truth_prevents_fake_execution(self) -> None:
        lifecycle = derive_concierge_lifecycle(
            claim_id="claim-concierge-blocked-001",
            claimant_label="demo-owner-cipher",
            claim_submitted=True,
            identity_verified=True,
            device_setup_complete=False,
            owner_confirmation_complete=False,
            support_intervention_required=False,
        )
        voice_turn = load_telegram_voice_turn(_load_example("schemas/examples/telegram-voice-turn.blocked.example.json"))
        continuity = load_cipher_continuity_record(
            _load_example("schemas/examples/cipher-continuity-record.carryover.example.json")
        )
        route = load_routing_provenance_event(
            {
                "event_id": "route-blocked-001",
                "provider": "local-runtime",
                "model": "llama-local",
                "mode": "local",
                "route_reason": "Website specialist cannot begin until activation handoff is ready.",
                "fallback_used": False,
                "fallback_refused": False,
                "learned_effect_allowed": True,
            }
        )

        result = derive_website_specialist_harness_record(
            harness_id="ws-harness-blocked-derived-001",
            request_id="ws-request-blocked-derived-001",
            execution_id="ws-execution-blocked-derived-001",
            lifecycle=lifecycle,
            voice_turn=voice_turn,
            continuity=continuity,
            route_event=route,
            requested_capability="website_update",
            request_source="telegram_voice_turn",
            support_safe_request_summary="Owner asked whether website work can start before activation setup is complete.",
            desired_outcome_summary="Do not start website-specialist execution until activation truth says handoff is ready.",
        )

        self.assertEqual(result["request"]["request_status"], "blocked")
        self.assertFalse(result["request"]["activation_ready"])
        self.assertEqual(result["execution"]["specialist_status"], "pending")
        self.assertEqual(result["execution"]["task_phase"], "blocked")
        self.assertEqual(result["activation_handoff_status"], "blocked")
        self.assertIn("blocked", result["support_safe_outcome_summary"].lower())

    def test_fallback_refused_outcome_stays_honest_without_silent_success_language(self) -> None:
        lifecycle = derive_concierge_lifecycle(
            claim_id="claim-concierge-001",
            claimant_label="demo-owner-cipher",
            claim_submitted=True,
            identity_verified=True,
            device_setup_complete=True,
            owner_confirmation_complete=True,
            support_intervention_required=False,
        )
        voice_turn = load_telegram_voice_turn(
            {
                "voice_turn_id": "tg-turn-ready-001",
                "platform": "telegram",
                "chat_id": "tg-chat-1001",
                "user_id": "tg-user-88",
                "voice_message_id": "tg-voice-msg-42",
                "voice_turn_status": "activation_ready",
                "activation_gate_status": "ready",
                "blocked_reason": None,
                "support_safe_status_summary": "Activation is ready and the owner received a voiced next-step reply.",
                "inbound_voice_note": {
                    "telegram_file_id": "file_abc123",
                    "telegram_file_unique_id": "unique_abc123",
                    "audio_duration_seconds": 21,
                    "mime_type": "audio/ogg",
                    "message_timestamp": "2026-03-21T12:00:00Z",
                    "source": "telegram_voice_note",
                },
                "transcript": {
                    "transcript_status": "available",
                    "transcript_language": "en",
                    "transcript_summary": "Owner asked Cipher to stay local even if a deeper website diagnostic is unavailable.",
                    "intent_summary": "Attempt website work without external fallback.",
                    "confidence_label": "high",
                    "redaction_level": "support_safe_summary_only",
                },
                "reply": {
                    "reply_status": "voiced",
                    "delivery_channel": "telegram_voice_note",
                    "voice_style": "concierge_warm",
                    "reply_summary": "Confirms readiness and continues the support-safe website handoff.",
                    "audio_duration_seconds": 18,
                    "contains_action_prompt": True,
                },
                "continuity": {
                    "continuity_status": "carryover",
                    "session_reference": "tg-session-042",
                    "turns_in_session": 3,
                    "carryover_summary": "Continues the same activation thread from the owner's earlier voice note.",
                    "prior_turn_reference": "tg-turn-041",
                    "memory_scope": "support_safe_carryover",
                },
            }
        )
        continuity = load_cipher_continuity_record(
            _load_example("schemas/examples/cipher-continuity-record.carryover.example.json")
        )
        route = load_routing_provenance_event(
            {
                "event_id": "route-fallback-refused-001",
                "provider": "local-runtime",
                "model": "llama-local",
                "mode": "local",
                "route_reason": "Local specialist could not expand coverage because external fallback was refused.",
                "fallback_used": False,
                "fallback_refused": True,
                "learned_effect_allowed": False,
            }
        )

        result = derive_website_specialist_harness_record(
            harness_id="ws-harness-refused-derived-001",
            request_id="ws-request-refused-derived-001",
            execution_id="ws-execution-refused-derived-001",
            lifecycle=lifecycle,
            voice_turn=voice_turn,
            continuity=continuity,
            route_event=route,
            requested_capability="diagnostic_review",
            request_source="telegram_voice_turn",
            support_safe_request_summary="Owner asked Cipher to keep the website diagnostic local even if fallback would help.",
            desired_outcome_summary="Refuse external fallback honestly and preserve support-safe continuity markers.",
        )

        self.assertEqual(result["execution"]["specialist_status"], "refused_fallback")
        self.assertEqual(result["execution"]["task_phase"], "blocked")
        self.assertTrue(result["execution"]["fallback_refused"])
        self.assertIn("refused", result["execution"]["disclosure_text"].lower())
        self.assertNotIn("completed", result["support_safe_outcome_summary"].lower())
        self.assertEqual(result["activation_handoff_status"], "activation_ready")


if __name__ == "__main__":
    unittest.main()
