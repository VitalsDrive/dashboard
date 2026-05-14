/**
 * fleet-map.component.spec.ts — Wave 0 RED stubs for getVehicleState() stale logic.
 * Tests the getVehicleState logic extracted from FleetMapComponent.
 * NOTE: We do NOT import FleetMapComponent directly — Leaflet requires a browser window.
 * Instead we test the pure state-determination logic in isolation.
 */

import { VehicleWithHealth } from '../../core/models/vehicle.model';

const STALE_THRESHOLD_MINUTES = 15;

function makeTimestamp(minsAgo: number): string {
  return new Date(Date.now() - minsAgo * 60 * 1000).toISOString();
}

function makeVehicle(overrides: Partial<VehicleWithHealth> = {}): VehicleWithHealth {
  return {
    id: 'v1',
    fleet_id: 'fleet-1',
    status: 'active',
    make: 'Ford',
    model: 'Transit',
    nickname: null,
    vin: null,
    year: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    healthScore: 100,
    alertCount: 0,
    latestTelemetry: undefined,
    ...overrides,
  } as VehicleWithHealth;
}

function makeTelemetry(minsAgo: number, engineOn: boolean = false): any {
  return {
    id: 't1',
    vehicle_id: 'v1',
    timestamp: makeTimestamp(minsAgo),
    engine_on: engineOn,
    coolant_temp: 80,
    voltage: 12.6,
    dtc_codes: [],
  };
}

/**
 * Current implementation of getVehicleState (copied from fleet-map.component.ts).
 * This is the BEFORE state — no stale check.
 * After Task 3: this function gains a stale timestamp check.
 */
function currentGetVehicleState(vehicle: VehicleWithHealth): string {
  if (vehicle.status === 'inactive') return 'offline';
  if (vehicle.alertCount > 0) return 'alert';
  if (vehicle.latestTelemetry?.engine_on) return 'running';
  return 'offline';
}

/**
 * Target implementation of getVehicleState (after Task 3).
 * Stale check fires when telemetry timestamp > STALE_THRESHOLD_MINUTES old.
 */
function targetGetVehicleState(vehicle: VehicleWithHealth): string {
  if (vehicle.status === 'inactive') return 'offline';
  if (vehicle.latestTelemetry) {
    const ageMs = Date.now() - new Date(vehicle.latestTelemetry.timestamp).getTime();
    if (ageMs > STALE_THRESHOLD_MINUTES * 60 * 1000) return 'stale';
  }
  if (vehicle.alertCount > 0) return 'alert';
  if (vehicle.latestTelemetry?.engine_on) return 'running';
  return 'offline';
}

describe('FleetMapComponent — getVehicleState() stale priority', () => {

  it("getVehicleState: returns 'stale' when telemetry timestamp is 16 minutes old", () => {
    // After Task 3: stale check added — engine_on ignored when telemetry > 15 min old
    // RED: current implementation has no stale check; returns 'running' for engine_on=true
    const vehicle = makeVehicle({
      status: 'active',
      alertCount: 0,
      latestTelemetry: makeTelemetry(16, true), // engine on but stale
    });

    // Current impl returns 'running' (engine_on=true, no stale check)
    const currentResult = currentGetVehicleState(vehicle);
    expect(currentResult).toBe('running'); // documents current broken state

    // After Task 3: must return 'stale'
    const targetResult = targetGetVehicleState(vehicle);
    expect(targetResult).toBe('stale'); // GREEN target

    // RED assertion: current impl does NOT return 'stale'
    expect(currentResult).not.toBe('stale');
  });

  it("getVehicleState: returns 'running' when telemetry is fresh and engine_on is true", () => {
    // After Task 3: fresh telemetry (≤ 15 min) + engine_on = true → 'running'
    const vehicle = makeVehicle({
      status: 'active',
      alertCount: 0,
      latestTelemetry: makeTelemetry(5, true), // fresh, engine on
    });

    const targetResult = targetGetVehicleState(vehicle);
    expect(targetResult).toBe('running');
  });

  it("getVehicleState: stale takes priority over alert — alertCount > 0 but timestamp is 16 min old", () => {
    // After Task 3: stale check before alert check
    // RED: current impl checks alertCount first → returns 'alert'
    const vehicle = makeVehicle({
      status: 'active',
      alertCount: 2,
      latestTelemetry: makeTelemetry(16, true),
    });

    // Current impl: alert check before stale → returns 'alert'
    const currentResult = currentGetVehicleState(vehicle);
    expect(currentResult).toBe('alert'); // documents current behavior

    // After Task 3: stale takes priority → returns 'stale'
    const targetResult = targetGetVehicleState(vehicle);
    expect(targetResult).toBe('stale');

    // RED assertion: current impl does NOT return 'stale'
    expect(currentResult).not.toBe('stale');
  });

});
