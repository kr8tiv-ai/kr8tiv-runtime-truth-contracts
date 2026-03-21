from __future__ import annotations

from typing import NotRequired, TypedDict

from .contracts import DisclosureHints, RouteDecisionResult, RoutingProvenanceEvent, TruthSurface
from .disclosure import DisclosureResult, format_route_disclosure
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

    disclosure_hints: DisclosureHints = {
        "fallback_policy": truth_surface.get("fallback_policy", {}),
        "disclosure_state": truth_surface.get("disclosure_state", {}),
    }

    if route["mode"] == "hybrid" or route["mode"] == "refused" or disclosure_hints["disclosure_state"].get("force_local_disclosure") is True:
        result["disclosure"] = format_route_disclosure(
            route,
            fallback_policy=disclosure_hints["fallback_policy"],
            disclosure_state=disclosure_hints["disclosure_state"],
        )

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
