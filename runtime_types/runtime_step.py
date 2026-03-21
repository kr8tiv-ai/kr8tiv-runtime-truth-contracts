from __future__ import annotations

from typing import NotRequired, TypedDict

from .contracts import (
    DisclosureHints,
    FeedbackLedgerEntry,
    RouteDecisionResult,
    RoutingProvenanceEvent,
    RuntimeArtifactFeedbackSelection,
    RuntimeArtifactPromotionAnalysis,
    RuntimeArtifactProvenance,
    RuntimeStepArtifacts,
    TruthSurface,
)
from .disclosure import DisclosureLevel, DisclosureResult, format_route_disclosure
from .feedback_selection import select_relevant_feedback
from .precedence import ResolutionResult, resolve_precedence
from .promotion import PromotionEvaluationResult, evaluate_feedback_promotion
from .promotion_audit import format_promotion_audit
from .routing import derive_route_decision


class RuntimeStepResult(TypedDict):
    precedence: ResolutionResult
    route: RouteDecisionResult
    artifacts: RuntimeStepArtifacts
    disclosure: NotRequired[DisclosureResult]
    promotion: NotRequired[PromotionEvaluationResult]


def _build_artifact_provenance(
    route: RouteDecisionResult,
    disclosure: DisclosureResult | None,
) -> RuntimeArtifactProvenance:
    disclosure_level: DisclosureLevel = disclosure["level"] if disclosure is not None else "none"
    return {
        "route_mode": route["mode"],
        "route_status": route["status"],
        "route_reason_code": route["reason_code"],
        "fallback_used": route["fallback_used"],
        "fallback_refused": route["fallback_refused"],
        "disclosure_level": disclosure_level,
        "disclosure_mentions_external_help": disclosure["mention_external_help"] if disclosure is not None else False,
        "disclosure_present": disclosure is not None,
    }


def _build_feedback_selection(feedback: FeedbackLedgerEntry | None) -> RuntimeArtifactFeedbackSelection:
    if feedback is None:
        return {
            "selected": False,
            "feedback_id": None,
            "target": None,
            "scope_requested": None,
            "promotion_status": None,
            "provenance": None,
        }
    return {
        "selected": True,
        "feedback_id": feedback["feedback_id"],
        "target": feedback["target"],
        "scope_requested": feedback["scope_requested"],
        "promotion_status": feedback["promotion_status"],
        "provenance": feedback["provenance"],
    }


def _build_promotion_analysis(
    feedback: FeedbackLedgerEntry | None,
    promotion: PromotionEvaluationResult | None,
) -> RuntimeArtifactPromotionAnalysis:
    if feedback is None or promotion is None:
        return {
            "status": "not_evaluated",
            "decision": None,
            "reason": "No matching feedback was selected for promotion evaluation.",
            "provenance_warning": False,
            "blocking_signal_type": None,
            "supporting_signal_used": False,
            "audit_summary": "decision=not_evaluated; signal=none; provenance=not_applicable; reason=No matching feedback was selected for promotion evaluation.",
        }

    return {
        "status": "evaluated",
        "decision": promotion["decision"],
        "reason": promotion["reason"],
        "provenance_warning": promotion["provenance_warning"],
        "blocking_signal_type": promotion["blocking_signal_type"],
        "supporting_signal_used": promotion["supporting_signal_used"],
        "audit_summary": format_promotion_audit(promotion),
    }


def _build_runtime_artifacts(
    route: RouteDecisionResult,
    disclosure: DisclosureResult | None,
    feedback: FeedbackLedgerEntry | None,
    promotion: PromotionEvaluationResult | None,
) -> RuntimeStepArtifacts:
    return {
        "schema_version": "1.0",
        "provenance": _build_artifact_provenance(route, disclosure),
        "feedback_selection": _build_feedback_selection(feedback),
        "promotion_analysis": _build_promotion_analysis(feedback, promotion),
    }


def resolve_runtime_step(
    key: str,
    truth_surface: TruthSurface,
    *,
    route_event: RoutingProvenanceEvent | None = None,
    default: object | None = None,
    evaluate_promotion: bool = False,
    project_repeat_count: int = 0,
    cross_project_repeat_count: int = 0,
    explicit_durable: bool = False,
    safe_to_learn: bool = True,
) -> RuntimeStepResult:
    route = derive_route_decision(truth_surface)
    disclosure: DisclosureResult | None = None
    feedback = None
    promotion: PromotionEvaluationResult | None = None

    disclosure_hints: DisclosureHints = {
        "fallback_policy": truth_surface.get("fallback_policy", {}),
        "disclosure_state": truth_surface.get("disclosure_state", {}),
    }

    if route["mode"] == "hybrid" or route["mode"] == "refused" or disclosure_hints["disclosure_state"].get("force_local_disclosure") is True:
        disclosure = format_route_disclosure(
            route,
            fallback_policy=disclosure_hints["fallback_policy"],
            disclosure_state=disclosure_hints["disclosure_state"],
        )

    if evaluate_promotion:
        feedback = select_relevant_feedback(key, truth_surface)
        if feedback is not None:
            promotion = evaluate_feedback_promotion(
                feedback,
                project_repeat_count=project_repeat_count,
                cross_project_repeat_count=cross_project_repeat_count,
                explicit_durable=explicit_durable,
                safe_to_learn=safe_to_learn,
                behavior_signals=truth_surface.get("recent_behavior_signals", []),
            )

    result: RuntimeStepResult = {
        "precedence": resolve_precedence(key, truth_surface, default),
        "route": route,
        "artifacts": _build_runtime_artifacts(route, disclosure, feedback, promotion),
    }

    if disclosure is not None:
        result["disclosure"] = disclosure

    if promotion is not None:
        result["promotion"] = promotion

    return result
