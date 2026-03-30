/**
 * Watchdog — Bot process monitor for VPS-hosted services.
 *
 * Tracks last activity per bot (Telegram, Discord, WhatsApp).
 * If no activity for 5 minutes AND no heartbeat → attempt graceful restart.
 * Max 3 restart attempts before entering FAILED state.
 * Alerts admin via Slack/Telegram on restart attempts and failures.
 *
 * State machine per service:
 *   HEALTHY → (5 min no activity + no heartbeat) → DEGRADED
 *   DEGRADED → (failure threshold) → RECOVERING → (restart succeeds) → HEALTHY
 *   RECOVERING → (3 failed restarts) → FAILED (admin alert)
 *
 * Usage:
 *   import { Watchdog } from './runtime/watchdog.js';
 *   const watchdog = new Watchdog({ db, alertFn });
 *   watchdog.start();
 */

// ============================================================================
// Types
// ============================================================================

export type WatchdogState = 'healthy' | 'degraded' | 'recovering' | 'failed';

export interface ServiceEntry {
  name: string;
  state: WatchdogState;
  lastActivity: number;
  restartAttempts: number;
  maxRestarts: number;
  /** Function to attempt restarting the service */
  restartFn?: () => Promise<boolean>;
}

export interface WatchdogConfig {
  /** Interval between health checks in ms. Default: 30000 */
  checkIntervalMs?: number;
  /** Max time without activity before marking degraded. Default: 300000 (5 min) */
  inactivityThresholdMs?: number;
  /** Max restart attempts before FAILED. Default: 3 */
  maxRestarts?: number;
  /** Function to deliver admin alerts */
  alertFn?: (message: string, severity: 'info' | 'warn' | 'critical') => Promise<void>;
}

// ============================================================================
// Watchdog
// ============================================================================

export class Watchdog {
  private services = new Map<string, ServiceEntry>();
  private config: Required<WatchdogConfig>;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: WatchdogConfig = {}) {
    this.config = {
      checkIntervalMs: config.checkIntervalMs ?? 30_000,
      inactivityThresholdMs: config.inactivityThresholdMs ?? 300_000,
      maxRestarts: config.maxRestarts ?? 3,
      alertFn: config.alertFn ?? defaultAlert,
    };
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /** Register a service for monitoring. */
  registerService(
    name: string,
    restartFn?: () => Promise<boolean>,
  ): void {
    this.services.set(name, {
      name,
      state: 'healthy',
      lastActivity: Date.now(),
      restartAttempts: 0,
      maxRestarts: this.config.maxRestarts,
      restartFn,
    });
  }

  /** Record activity for a service (call this when the bot handles a message). */
  recordActivity(name: string): void {
    const entry = this.services.get(name);
    if (entry) {
      entry.lastActivity = Date.now();
      if (entry.state === 'degraded' || entry.state === 'recovering') {
        entry.state = 'healthy';
        entry.restartAttempts = 0;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Health Check Loop
  // --------------------------------------------------------------------------

  start(): void {
    if (this.timer) return;
    console.log(`[Watchdog] Starting with ${this.services.size} services`);

    this.timer = setInterval(() => this.tick(), this.config.checkIntervalMs);
    if (this.timer && typeof this.timer === 'object' && 'unref' in this.timer) {
      this.timer.unref();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();

    for (const [name, entry] of this.services) {
      const idleMs = now - entry.lastActivity;

      switch (entry.state) {
        case 'healthy': {
          if (idleMs > this.config.inactivityThresholdMs) {
            entry.state = 'degraded';
            console.log(`[Watchdog] ${name}: healthy → degraded (idle ${Math.round(idleMs / 1000)}s)`);
            await this.config.alertFn(
              `${name} has been inactive for ${Math.round(idleMs / 60_000)} minutes`,
              'warn',
            );
          }
          break;
        }

        case 'degraded': {
          // Attempt restart
          entry.state = 'recovering';
          entry.restartAttempts++;
          console.log(`[Watchdog] ${name}: attempting restart (${entry.restartAttempts}/${entry.maxRestarts})`);

          if (entry.restartFn) {
            try {
              const success = await entry.restartFn();
              if (success) {
                entry.state = 'healthy';
                entry.lastActivity = Date.now();
                entry.restartAttempts = 0;
                console.log(`[Watchdog] ${name}: restart succeeded`);
                await this.config.alertFn(`${name} restarted successfully`, 'info');
              } else {
                throw new Error('Restart returned false');
              }
            } catch (err) {
              if (entry.restartAttempts >= entry.maxRestarts) {
                entry.state = 'failed';
                console.error(`[Watchdog] ${name}: FAILED after ${entry.maxRestarts} attempts`);
                await this.config.alertFn(
                  `CRITICAL: ${name} failed after ${entry.maxRestarts} restart attempts. Manual intervention required.`,
                  'critical',
                );
              } else {
                entry.state = 'degraded'; // Will retry next tick
                console.log(`[Watchdog] ${name}: restart failed, will retry`);
              }
            }
          } else {
            // No restart function — can only alert
            entry.state = 'failed';
            await this.config.alertFn(
              `${name} is unresponsive and no restart function is registered`,
              'critical',
            );
          }
          break;
        }

        case 'recovering': {
          // Should not stay in recovering between ticks, but handle gracefully
          entry.state = 'degraded';
          break;
        }

        case 'failed': {
          // Stay failed until manual intervention or activity detected
          break;
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Introspection
  // --------------------------------------------------------------------------

  getStatus(): Array<{ name: string; state: WatchdogState; idleMs: number; restartAttempts: number }> {
    const now = Date.now();
    return Array.from(this.services.values()).map((e) => ({
      name: e.name,
      state: e.state,
      idleMs: now - e.lastActivity,
      restartAttempts: e.restartAttempts,
    }));
  }
}

// ============================================================================
// Default Alert
// ============================================================================

async function defaultAlert(
  message: string,
  severity: 'info' | 'warn' | 'critical',
): Promise<void> {
  const prefix = severity === 'critical' ? '🚨' : severity === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`[Watchdog Alert] ${prefix} ${message}`);

  // Slack webhook if configured
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) {
    try {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${prefix} [KIN Watchdog] ${message}` }),
      });
    } catch {
      // Non-fatal
    }
  }
}
