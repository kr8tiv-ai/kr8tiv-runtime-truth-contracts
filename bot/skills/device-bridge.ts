/**
 * Device Bridge Protocol — WebSocket bridge for desktop computer control.
 *
 * Manages persistent WebSocket connections between KIN companions and
 * desktop devices. Handles pairing, heartbeat, tool request routing,
 * and automatic reconnection tracking with exponential backoff.
 *
 * @module bot/skills/device-bridge
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Protocol Types
// ---------------------------------------------------------------------------

/** Trust levels for device operations (0 = untrusted, 3 = full trust) */
export type TrustLevel = 0 | 1 | 2 | 3;

/** Request sent from KIN to the connected desktop device */
export interface DeviceToolRequest {
  requestId: string;
  toolName: string;
  params: Record<string, unknown>;
  trustLevel: TrustLevel;
}

/** Response sent back from the desktop device to KIN */
export interface DeviceToolResponse {
  requestId: string;
  result?: unknown;
  error?: string;
}

/** Pairing handshake payload from a desktop device */
export interface DevicePairing {
  pairingCode: string;
  deviceName: string;
  platform: 'windows' | 'macos' | 'linux';
  capabilities: string[];
}

/** Heartbeat sent periodically by the desktop device */
export interface DeviceHeartbeat {
  deviceId: string;
  timestamp: number;
  capabilities: string[];
}

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

/** Tracks a connected device and its WebSocket */
export interface DeviceConnection {
  /** User who owns this device connection */
  userId: string;
  /** WebSocket instance for the device */
  ws: WebSocket | { send: (data: string) => void; readyState: number };
  /** Device display name */
  deviceName: string;
  /** Operating system platform */
  platform: 'windows' | 'macos' | 'linux';
  /** Current capabilities reported by the device */
  capabilities: string[];
  /** Current trust level for the device */
  trustLevel: TrustLevel;
  /** Last heartbeat timestamp (ms since epoch) */
  lastHeartbeat: number;
  /** Pending tool requests awaiting responses */
  pendingRequests: Map<string, {
    resolve: (response: DeviceToolResponse) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>;
}

/** Tracks reconnection backoff state per user */
interface ReconnectState {
  attempts: number;
  nextAttemptAt: number;
}

/** Pending pairing code waiting for a device to connect */
export interface PendingPairing {
  userId: string;
  code: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOOL_REQUEST_TIMEOUT_MS = 30_000;
const HEARTBEAT_STALE_MS = 60_000;
const MAX_BACKOFF_MS = 300_000; // 5 minutes
const PAIRING_CODE_EXPIRY_MS = 300_000; // 5 minutes

// ---------------------------------------------------------------------------
// DeviceBridgeManager (singleton)
// ---------------------------------------------------------------------------

export class DeviceBridgeManager {
  private static instance: DeviceBridgeManager | null = null;

  /** Connected devices keyed by userId */
  private devices = new Map<string, DeviceConnection>();

  /** Reconnection backoff tracking per userId */
  private reconnectStates = new Map<string, ReconnectState>();

  /** Pending pairing codes keyed by code string */
  private pendingPairings = new Map<string, PendingPairing>();

  private constructor() {}

  /** Get the singleton instance */
  static getInstance(): DeviceBridgeManager {
    if (!DeviceBridgeManager.instance) {
      DeviceBridgeManager.instance = new DeviceBridgeManager();
    }
    return DeviceBridgeManager.instance;
  }

  // -------------------------------------------------------------------------
  // Pairing
  // -------------------------------------------------------------------------

  /**
   * Generate a 6-digit pairing code for a user.
   * Expires after 5 minutes. Only one active code per user.
   */
  generatePairingCode(userId: string): PendingPairing {
    // Remove any existing pairing for this user
    for (const [code, pairing] of this.pendingPairings) {
      if (pairing.userId === userId) {
        this.pendingPairings.delete(code);
      }
    }

    const code = String(crypto.randomInt(100_000, 999_999));
    const pairing: PendingPairing = {
      userId,
      code,
      expiresAt: Date.now() + PAIRING_CODE_EXPIRY_MS,
    };

    this.pendingPairings.set(code, pairing);
    return pairing;
  }

  /**
   * Validate a pairing code and return the associated pending pairing.
   * Returns null if code is invalid or expired.
   */
  validatePairingCode(code: string): PendingPairing | null {
    const pairing = this.pendingPairings.get(code);
    if (!pairing) return null;
    if (Date.now() > pairing.expiresAt) {
      this.pendingPairings.delete(code);
      return null;
    }
    return pairing;
  }

  /**
   * Complete the pairing process for a device.
   * Establishes the WebSocket connection and cleans up the pairing code.
   */
  pairDevice(
    userId: string,
    ws: DeviceConnection['ws'],
    pairing: DevicePairing,
  ): DeviceConnection {
    // Disconnect any existing device for this user
    this.handleDisconnect(userId);

    // Clear the used pairing code
    this.pendingPairings.delete(pairing.pairingCode);

    // Reset reconnection state on successful pair
    this.reconnectStates.delete(userId);

    const connection: DeviceConnection = {
      userId,
      ws,
      deviceName: pairing.deviceName,
      platform: pairing.platform,
      capabilities: pairing.capabilities,
      trustLevel: 0, // Start untrusted; user must explicitly upgrade
      lastHeartbeat: Date.now(),
      pendingRequests: new Map(),
    };

    this.devices.set(userId, connection);
    return connection;
  }

  // -------------------------------------------------------------------------
  // Tool Request / Response
  // -------------------------------------------------------------------------

  /**
   * Send a tool request to the user's connected device.
   * Returns a promise that resolves with the device response or rejects on timeout.
   */
  sendToolRequest(userId: string, request: DeviceToolRequest): Promise<DeviceToolResponse> {
    const device = this.devices.get(userId);
    if (!device) {
      return Promise.reject(new Error('No device connected for this user'));
    }

    // Check WebSocket readyState (1 = OPEN)
    if (device.ws.readyState !== 1) {
      return Promise.reject(new Error('Device WebSocket is not open'));
    }

    return new Promise<DeviceToolResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        device.pendingRequests.delete(request.requestId);
        reject(new Error(`Device tool request timed out after ${TOOL_REQUEST_TIMEOUT_MS}ms`));
      }, TOOL_REQUEST_TIMEOUT_MS);

      device.pendingRequests.set(request.requestId, { resolve, reject, timer });

      device.ws.send(JSON.stringify({
        type: 'tool_request',
        ...request,
      }));
    });
  }

  /**
   * Handle an incoming tool response from a device.
   * Routes the response to the pending request promise.
   */
  handleToolResponse(userId: string, response: DeviceToolResponse): void {
    const device = this.devices.get(userId);
    if (!device) return;

    const pending = device.pendingRequests.get(response.requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    device.pendingRequests.delete(response.requestId);

    if (response.error) {
      pending.reject(new Error(response.error));
    } else {
      pending.resolve(response);
    }
  }

  // -------------------------------------------------------------------------
  // Heartbeat
  // -------------------------------------------------------------------------

  /** Process a heartbeat from a connected device */
  handleHeartbeat(userId: string, heartbeat: DeviceHeartbeat): void {
    const device = this.devices.get(userId);
    if (!device) return;

    device.lastHeartbeat = heartbeat.timestamp;
    device.capabilities = heartbeat.capabilities;
  }

  /** Check if a device connection is stale (no recent heartbeat) */
  isDeviceStale(userId: string): boolean {
    const device = this.devices.get(userId);
    if (!device) return true;
    return Date.now() - device.lastHeartbeat > HEARTBEAT_STALE_MS;
  }

  // -------------------------------------------------------------------------
  // Disconnection & Reconnection
  // -------------------------------------------------------------------------

  /** Handle device disconnection: clean up resources, track backoff */
  handleDisconnect(userId: string): void {
    const device = this.devices.get(userId);
    if (!device) return;

    // Reject all pending requests
    for (const [, pending] of device.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Device disconnected'));
    }
    device.pendingRequests.clear();

    this.devices.delete(userId);

    // Track reconnection backoff
    const existing = this.reconnectStates.get(userId);
    const attempts = existing ? existing.attempts + 1 : 1;
    const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), MAX_BACKOFF_MS);

    this.reconnectStates.set(userId, {
      attempts,
      nextAttemptAt: Date.now() + backoffMs,
    });
  }

  /** Check if a user can attempt reconnection (respects backoff) */
  canReconnect(userId: string): boolean {
    const state = this.reconnectStates.get(userId);
    if (!state) return true;
    return Date.now() >= state.nextAttemptAt;
  }

  /** Get reconnection backoff info for a user */
  getReconnectState(userId: string): ReconnectState | null {
    return this.reconnectStates.get(userId) ?? null;
  }

  // -------------------------------------------------------------------------
  // Trust Level
  // -------------------------------------------------------------------------

  /** Get the current trust level for a user's device */
  getTrustLevel(userId: string): TrustLevel {
    const device = this.devices.get(userId);
    return device?.trustLevel ?? 0;
  }

  /** Upgrade trust level (only allows +1 increments) */
  upgradeTrustLevel(userId: string): TrustLevel | null {
    const device = this.devices.get(userId);
    if (!device) return null;
    if (device.trustLevel >= 3) return device.trustLevel;

    device.trustLevel = (device.trustLevel + 1) as TrustLevel;
    return device.trustLevel;
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /** Get the device connection for a user, or null if not connected */
  getDevice(userId: string): DeviceConnection | null {
    return this.devices.get(userId) ?? null;
  }

  /** Check if a user has a connected device */
  isConnected(userId: string): boolean {
    const device = this.devices.get(userId);
    if (!device) return false;
    return device.ws.readyState === 1;
  }

  /** Get a summary of the device status for API responses */
  getDeviceStatus(userId: string): {
    connected: boolean;
    deviceName: string | null;
    platform: string | null;
    trustLevel: TrustLevel;
    capabilities: string[];
  } {
    const device = this.devices.get(userId);
    if (!device || device.ws.readyState !== 1) {
      return {
        connected: false,
        deviceName: null,
        platform: null,
        trustLevel: 0,
        capabilities: [],
      };
    }

    return {
      connected: true,
      deviceName: device.deviceName,
      platform: device.platform,
      trustLevel: device.trustLevel,
      capabilities: device.capabilities,
    };
  }
}

/** Get the singleton DeviceBridgeManager instance */
export function getDeviceBridge(): DeviceBridgeManager {
  return DeviceBridgeManager.getInstance();
}
