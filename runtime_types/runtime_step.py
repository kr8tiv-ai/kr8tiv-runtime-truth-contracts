from __future__ import annotations

from typing import NotRequired, TypedDict

from .contracts import RouteDecisionResult, RoutingProvenanceEvent, TruthSurface
from .disclosure import DisclosureResult, format_provenance_disclosure
from .feedback_selection import select_relevant_feedback
from .precedence import ResolutionResult, resolve_precedence
from .promotion import PromotionEvaluationResult, evaluate_feedback_promotion
from .routing import derive_route_decision


class RuntimeStepResult(TypedDict):
    precedence: ResolutionResult
    route: RouteDecisionResult
    disclosure: NotRequired[DisclosureResult]
    promotion: NotRequired[PromotionEvaluationResult]


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
    result: RuntimeStepResult = {
        "precedence": resolve_precedence(key, truth_surface, default),
        "route": route,
    }

    disclosure_event: RoutingProvenanceEvent | None = route_event
    if disclosure_event is None:
        disclosure_event = {
            "event_id": "runtime-owned-route",
            "provider": "runtime-core",
            "model": "truth-surface",
            "mode": "external" if route["mode"] == "refused" else route["mode"],
            "route_reason": route["reason"],
            "fallback_used": route["fallback_used"],
            "fallback_refused": route["fallback_refused"],
            "learned_effect_allowed": route["refusal"]["learned_effect_allowed"] if route["refusal"] is not None else True,
        }

    if route["fallback_used"] or route["fallback_refused"]:
        result["disclosure"] = format_provenance_disclosure(disclosure_event)

    if evaluate_promotion:
        feedback = select_relevant_feedback(key, truth_surface)
        if feedback is not None:
            result["promotion"] = evaluate_feedback_promotion(
                feedback,
                project_repeat_count=project_repeat_count,
                cross_project_repeat_count=cross_project_repeat_count,
                explicit_durable=explicit_durable,
                safe_to_learn=safe_to_learn,
                behavior_signals=truth_surface.get("recent_behavior_signals", []),
            )

    return result
