/**
 * Circuit Breaker — Tracks provider failures and skips unhealthy ones
 *
 * Prevents wasting time on providers that are down by maintaining a
 * per-provider failure count with three states:
 *   CLOSED    — Normal operation, requests flow through
 *   OPEN      — Provider is unhealthy, skip it
 *   HALF_OPEN — Cooldown elapsed, allow a single probe request
 *
 * @module inference/providers/circuit-breaker
 */

import type { FrontierProviderId } from './types.js';

// ============================================================================
// Types
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before transitioning OPEN -> HALF_OPEN */
  resetTimeoutMs: number;
  /** Max probe attempts allowed while HALF_OPEN before re-opening */
  halfOpenMaxAttempts: number;
}

export interface ProviderCircuit {
  state: CircuitState;
  failures: number;
  lastFailureAt: number;
  halfOpenAttempts: number;
}

export interface ProviderHealthStatus {
  providerId: FrontierProviderId;
  state: CircuitState;
  failures: number;
  healthy: boolean;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
};

// ============================================================================
// State
// ============================================================================

let config: CircuitBreakerConfig = { ...DEFAULT_CONFIG };
const circuits = new Map<FrontierProviderId, ProviderCircuit>();

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Return the circuit entry for a provider, creating a healthy default if absent.
 */
function getCircuit(providerId: FrontierProviderId): ProviderCircuit {
  let circuit = circuits.get(providerId);
  if (!circuit) {
    circuit = {
      state: 'CLOSED',
      failures: 0,
      lastFailureAt: 0,
      halfOpenAttempts: 0,
    };
    circuits.set(providerId, circuit);
  }
  return circuit;
}

/**
 * If a circuit is OPEN and the reset timeout has elapsed, transition it to
 * HALF_OPEN so the next request acts as a probe.
 */
function maybeTransitionToHalfOpen(circuit: ProviderCircuit): void {
  if (circuit.state !== 'OPEN') return;
  const elapsed = Date.now() - circuit.lastFailureAt;
  if (elapsed >= config.resetTimeoutMs) {
    circuit.state = 'HALF_OPEN';
    circuit.halfOpenAttempts = 0;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Record a successful response from a provider.
 * Resets the failure counter and closes the circuit.
 */
export function recordSuccess(providerId: FrontierProviderId): void {
  const circuit = getCircuit(providerId);
  circuit.state = 'CLOSED';
  circuit.failures = 0;
  circuit.halfOpenAttempts = 0;
}

/**
 * Record a failed response from a provider.
 * Increments the failure counter and opens the circuit when the threshold is
 * reached. If the circuit is HALF_OPEN and the probe fails, it re-opens
 * immediately.
 */
export function recordFailure(providerId: FrontierProviderId): void {
  const circuit = getCircuit(providerId);
  circuit.failures += 1;
  circuit.lastFailureAt = Date.now();

  if (circuit.state === 'HALF_OPEN') {
    // Probe failed — re-open immediately
    circuit.state = 'OPEN';
    return;
  }

  if (circuit.failures >= config.failureThreshold) {
    circuit.state = 'OPEN';
  }
}

/**
 * Check whether a provider is healthy enough to receive a request.
 * Returns `true` for CLOSED (normal) and HALF_OPEN (probe allowed).
 * Automatically transitions OPEN -> HALF_OPEN when the reset timeout elapses.
 */
export function isProviderHealthy(providerId: FrontierProviderId): boolean {
  const circuit = getCircuit(providerId);
  maybeTransitionToHalfOpen(circuit);

  if (circuit.state === 'CLOSED') return true;

  if (circuit.state === 'HALF_OPEN') {
    if (circuit.halfOpenAttempts < config.halfOpenMaxAttempts) {
      circuit.halfOpenAttempts += 1;
      return true;
    }
    // Exhausted probe attempts — back to OPEN
    circuit.state = 'OPEN';
    circuit.lastFailureAt = Date.now();
    return false;
  }

  // OPEN
  return false;
}

/**
 * Return the health status of every provider that has been tracked so far.
 */
export function getProviderHealth(): ProviderHealthStatus[] {
  const statuses: ProviderHealthStatus[] = [];

  for (const [providerId, circuit] of circuits) {
    maybeTransitionToHalfOpen(circuit);
    statuses.push({
      providerId,
      state: circuit.state,
      failures: circuit.failures,
      healthy: circuit.state === 'CLOSED' || circuit.state === 'HALF_OPEN',
    });
  }

  return statuses;
}

/**
 * Reset all circuits to their default healthy state.
 * Intended for testing and administrative resets.
 */
export function resetAllCircuits(): void {
  circuits.clear();
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Override the default circuit breaker configuration.
 * Merges the provided values with the current config.
 */
export function configureCircuitBreaker(
  overrides: Partial<CircuitBreakerConfig>,
): void {
  config = { ...config, ...overrides };
}
