from __future__ import annotations

from .contracts import (
    DisclosureHints,
    DisclosureLevel,
    RouteDecisionResult,
    RouteDisclosureMode,
    RoutingProvenanceEvent,
)

DisclosureResult = RouteDisclosureMode


def format_route_disclosure(
    route: RouteDecisionResult,
    *,
    fallback_policy: dict[str, object] | None = None,
    disclosure_state: dict[str, object] | None = None,
) -> DisclosureResult:
    """Format the canonical user-facing disclosure from the runtime-owned route result.

    Optional policy/state hints allow wording to stay aligned with future governance
    surfaces, but the selected route result remains the only truth source for what
    happened on this step.
    """

    fallback_policy = fallback_policy or {}
    disclosure_state = disclosure_state or {}
    force_explicit_local = disclosure_state.get("force_local_disclosure") is True
    disclose_external_help = fallback_policy.get("must_disclose_material_external_help") is True

    if route["status"] == "refused":
        refusal_message = route["refusal"]["message"] if route["refusal"] is not None else route["reason"]
        return {
            "level": "brief",
            "text": (
                "This step was refused under the active route and fallback policy. "
                f"No external execution ran. Reason: {refusal_message}"
            ),
            "mention_external_help": False,
            "route_mode": route["mode"],
            "status": route["status"],
        }

    if route["mode"] == "hybrid":
        return {
            "level": "explicit",
            "text": (
                "This step used a hybrid path: local execution with external help for "
                f"quality or capability support. Reason: {route['reason']}"
            ),
            "mention_external_help": True,
            "route_mode": route["mode"],
            "status": route["status"],
        }

    local_level: DisclosureLevel = "explicit" if force_explicit_local else "brief"
    local_text = "This step ran on the local path."
    if disclose_external_help and route["fallback_used"]:
        local_text += " External help was not used despite fallback disclosure policy being active."
    elif force_explicit_local:
        local_text += f" Reason: {route['reason']}"

    return {
        "level": local_level,
        "text": local_text,
        "mention_external_help": False,
        "route_mode": route["mode"],
        "status": route["status"],
    }


def format_provenance_disclosure(event: RoutingProvenanceEvent) -> DisclosureResult:
    """Legacy compatibility bridge for older provenance-event callers.

    Canonical runtime disclosure should use format_route_disclosure() with the
    RouteDecisionResult produced by resolve_runtime_step(...)["route"].
    """

    if event["fallback_refused"]:
        route: RouteDecisionResult = {
            "mode": "refused",
            "status": "refused",
            "reason": event["route_reason"],
            "reason_code": "policy_refusal",
            "fallback_allowed": False,
            "fallback_used": False,
            "fallback_refused": True,
            "refusal": {
                "kind": "policy_refusal",
                "message": event["route_reason"],
                "learned_effect_allowed": event["learned_effect_allowed"],
            },
        }
        return format_route_disclosure(route)

    route: RouteDecisionResult = {
        "mode": "hybrid" if event["mode"] == "hybrid" else "local",
        "status": "selected",
        "reason": event["route_reason"],
        "reason_code": "quality_support_needed" if event["mode"] == "hybrid" else "local_policy_default",
        "fallback_allowed": True,
        "fallback_used": event["fallback_used"],
        "fallback_refused": False,
        "refusal": None,
    }
    return format_route_disclosure(route)
