from __future__ import annotations

from .contracts import RouteDecisionResult, TruthSurface


def _bool_flag(container: dict[str, object], key: str) -> bool:
    value = container.get(key)
    return value is True


def derive_route_decision(truth_surface: TruthSurface) -> RouteDecisionResult:
    """Derive the canonical runtime route result from the truth surface.

    This helper stays intentionally narrow for S01: it only looks at existing
    task/policy fields already present in the repository's truth-surface schema.
    The goal is one deterministic decision seam that later slices can enrich,
    without requiring callers to author route truth externally.
    """

    routing_policy = truth_surface.get("routing_policy", {})
    fallback_policy = truth_surface.get("fallback_policy", {})
    current_task = truth_surface.get("current_task", {})
    revision_budget = truth_surface.get("revision_budget", {})

    fallback_allowed = not _bool_flag(fallback_policy, "refuse_on_local_only_tasks")
    local_only = _bool_flag(current_task, "local_only")
    high_complexity = current_task.get("complexity") == "high"
    hybrid_allowed_for_complexity = _bool_flag(routing_policy, "high_complexity_allows_hybrid")
    remaining_budget = revision_budget.get("remaining")
    budget_exhausted = isinstance(remaining_budget, int) and remaining_budget <= 0

    if budget_exhausted:
        return {
            "mode": "refused",
            "status": "refused",
            "reason": "Revision budget is exhausted, so the runtime will not escalate this step to fallback routing.",
            "reason_code": "revision_budget_exhausted",
            "fallback_allowed": fallback_allowed,
            "fallback_used": False,
            "fallback_refused": True,
            "refusal": {
                "kind": "manual_review_required",
                "message": "Revision budget is exhausted; manual review is required before trying fallback.",
                "learned_effect_allowed": False,
            },
        }

    if local_only and _bool_flag(fallback_policy, "refuse_on_local_only_tasks"):
        return {
            "mode": "refused",
            "status": "refused",
            "reason": "This task is marked local-only and the fallback policy forbids external fallback.",
            "reason_code": "fallback_disallowed",
            "fallback_allowed": False,
            "fallback_used": False,
            "fallback_refused": True,
            "refusal": {
                "kind": "policy_refusal",
                "message": "External fallback is not permitted for this local-only task.",
                "learned_effect_allowed": False,
            },
        }

    if high_complexity and hybrid_allowed_for_complexity:
        return {
            "mode": "hybrid",
            "status": "selected",
            "reason": "High-complexity work is allowed to use hybrid support under the active routing policy.",
            "reason_code": "quality_support_needed",
            "fallback_allowed": fallback_allowed,
            "fallback_used": True,
            "fallback_refused": False,
            "refusal": None,
        }

    return {
        "mode": "local",
        "status": "selected",
        "reason": "The active routing policy keeps this step on the local path by default.",
        "reason_code": "local_policy_default",
        "fallback_allowed": fallback_allowed,
        "fallback_used": False,
        "fallback_refused": False,
        "refusal": None,
    }
