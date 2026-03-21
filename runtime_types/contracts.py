from __future__ import annotations

from typing import Literal, TypedDict, TypeAlias

ScopeRequested: TypeAlias = Literal["turn", "project", "owner", "unspecified"]
FeedbackTarget: TypeAlias = Literal["output", "tone", "design", "workflow", "routing", "teaching", "other"]
FeedbackPolarity: TypeAlias = Literal["positive", "negative", "correction"]
FeedbackSource: TypeAlias = Literal["user", "reviewer", "system"]
PromotionStatus: TypeAlias = Literal["local-only", "promoted", "rejected", "expired"]
ProvenanceLevel: TypeAlias = Literal["local-proven", "hybrid-proven", "external-only", "not-yet-proven"]
PreferenceScope: TypeAlias = Literal["project", "owner"]
ConflictStatus: TypeAlias = Literal["active", "superseded", "contradicted", "paused"]
RouteMode: TypeAlias = Literal["local", "hybrid", "external"]
DestinationScope: TypeAlias = Literal["project", "owner"]
BehaviorSignalType: TypeAlias = Literal[
    "suggestion_not_adopted",
    "user_repair",
    "repeated_manual_fix",
    "proposal_reverted",
    "accepted_without_edit",
]
DisclosureLevel: TypeAlias = Literal["none", "brief", "explicit"]
PromotionDecision: TypeAlias = Literal["local-only", "project", "owner", "reject"]
PromotionAnalysisStatus: TypeAlias = Literal["evaluated", "not-evaluated"]
RuntimeReadinessStatus: TypeAlias = Literal["ready", "not-ready"]
GenesisTier: TypeAlias = Literal["Egg", "Hatchling", "Elder"]
GenesisBloodline: TypeAlias = Literal["Mischief", "Vortex", "Forge", "Aether", "Catalyst", "Cipher"]
GenesisClaimFailureReason: TypeAlias = Literal[
    "not_genesis_collection",
    "unresolvable_metadata",
]
RebindingStatus: TypeAlias = Literal["pending_onboarding", "blocked"]
OwnerAccessStatus: TypeAlias = Literal["revoked"]
PrivateStateStatus: TypeAlias = Literal["detached"]
ManualCheckpoint: TypeAlias = Literal["await_rebinding_fee", "await_new_owner_onboarding"]


class FeedbackLedgerEntry(TypedDict):
    feedback_id: str
    feedback_text: str
    timestamp: str
    scope_requested: ScopeRequested
    target: FeedbackTarget
    polarity: FeedbackPolarity
    source: FeedbackSource
    applied_to: str
    promotion_status: PromotionStatus
    provenance: ProvenanceLevel


class BehaviorSignalEntry(TypedDict):
    signal_id: str
    timestamp: str
    target: FeedbackTarget
    signal_type: BehaviorSignalType
    strength: float
    applied_to: str
    source_route: RouteMode
    notes: str


class PreferenceRecord(TypedDict):
    preference_id: str
    rule: str
    scope: PreferenceScope
    confidence: float
    evidence_count: int
    last_confirmed_at: str
    conflict_status: ConflictStatus
    origin_feedback_ids: list[str]
    provenance_level: Literal["local-proven", "hybrid-proven", "external-only"]


class RoutingProvenanceEvent(TypedDict):
    event_id: str
    provider: str
    model: str
    mode: RouteMode
    route_reason: str
    fallback_used: bool
    fallback_refused: bool
    learned_effect_allowed: bool


class PromotionDecisionRecord(TypedDict):
    decision_id: str
    promoted_rule: str
    source_feedback_ids: list[str]
    destination_scope: DestinationScope
    evidence_summary: str
    override_conditions: str
    decision_timestamp: str


class TruthSurface(TypedDict):
    active_spec: dict[str, object]
    active_policy: dict[str, object]
    current_task: dict[str, object]
    persona_anchor: dict[str, object]
    routing_policy: dict[str, object]
    fallback_policy: dict[str, object]
    critique_policy: dict[str, object]
    revision_budget: dict[str, object]
    active_project_preferences: list[PreferenceRecord]
    active_owner_preferences: list[PreferenceRecord]
    recent_explicit_feedback: list[FeedbackLedgerEntry]
    recent_behavior_signals: list[BehaviorSignalEntry]
    disclosure_state: dict[str, object]


class RuntimeArtifactProvenance(TypedDict):
    route_mode: RouteMode
    route_reason: str
    fallback_used: bool
    fallback_refused: bool
    disclosure_level: DisclosureLevel
    disclosure_text: str
    mention_external_help: bool


class RuntimeArtifactFeedbackSelection(TypedDict):
    selected: bool
    selected_feedback_id: str | None
    scope_requested: ScopeRequested | None
    target: FeedbackTarget | None
    selection_reason: str


class RuntimeArtifactPromotionAnalysis(TypedDict):
    evaluated: bool
    status: PromotionAnalysisStatus
    decision: PromotionDecision | None
    reason: str
    provenance_warning: bool
    blocking_signal_type: BehaviorSignalType | None
    supporting_signal_used: bool
    audit_summary: str


class RuntimeStepArtifacts(TypedDict):
    provenance: RuntimeArtifactProvenance
    feedback_selection: RuntimeArtifactFeedbackSelection
    promotion_analysis: RuntimeArtifactPromotionAnalysis


class RuntimeReadinessChecks(TypedDict):
    artifact_present: bool
    disclosure_matches_provenance: bool
    promotion_matches_artifact: bool


class RuntimeReadinessSummary(TypedDict):
    status: RuntimeReadinessStatus
    checks: RuntimeReadinessChecks
    failed_checks: list[str]
    mismatches: list[str]


class GenesisOwnershipRecord(TypedDict):
    asset_id: str
    collection: str
    owner_wallet: str
    bloodline: GenesisBloodline


class GenesisEntitlementRecord(TypedDict):
    tier: GenesisTier
    included_months: int
    lifetime_discount_percent: int
    solana_rewards_percent: int


class GenesisClaimResult(TypedDict):
    eligible: bool
    failure_reason: GenesisClaimFailureReason | None
    ownership: GenesisOwnershipRecord | None
    entitlement: GenesisEntitlementRecord | None


class RebindingLifecycleRecord(TypedDict):
    asset_id: str
    previous_owner_wallet: str
    current_owner_wallet: str
    transferable_state_ref: str
    private_state_ref: str
    private_state_status: PrivateStateStatus
    old_owner_access_status: OwnerAccessStatus
    status: RebindingStatus
    blocking_reason: str | None
    manual_checkpoint: ManualCheckpoint
