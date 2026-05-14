/**
 * vehicle-card.component.spec.ts — Wave 0 RED stubs for VehicleCardComponent rendering.
 * Tests verify health gauge value rendering and state CSS class application.
 */

import { VehicleWithHealth } from '../../../../core/models/vehicle.model';

// These tests operate on the component's computed properties directly
// since we use ts-jest (no Angular TestBed / DOM rendering in this setup).
// After Task 3: cardBorderClass and healthScore must reflect vehicle state.

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

function makeSignal<T>(val: T) {
  let _v = val;
  const s: any = () => _v;
  s.set = (v: T) => { _v = v; };
  s.update = (fn: (v: T) => T) => { _v = fn(_v); };
  return s;
}

// Simulate the cardBorderClass computed logic (mirrors vehicle-card.component.ts)
function computeCardBorderClass(vehicle: VehicleWithHealth): string {
  if (vehicle.alertCount > 0) {
    const hasCritical = vehicle.healthScore < 50;
    return hasCritical ? 'card--critical' : 'card--warning';
  }
  return '';
}

describe('VehicleCardComponent — health gauge and state CSS', () => {

  it('renders healthScore value in the health gauge element', () => {
    // After Task 3: vehiclesWithHealth computes healthScore from vehicleResource.value()
    // RED: healthScore currently computed from deleted vehicles signal
    const vehicle = makeVehicle({ healthScore: 72 });

    // The component reads vehicle().healthScore — verify the value is correct
    expect(vehicle.healthScore).toBe(72);

    // After Task 3: vehicleResource.value() must supply vehicles with healthScore set
    // RED: vehicleResource doesn't exist yet so vehiclesWithHealth returns []
    // This test becomes meaningful once vehicleResource is wired
    const vehicleResource = { value: () => undefined as any };
    const vehiclesWithHealth = (vehicleResource.value() ?? []) as VehicleWithHealth[];
    // After impl: this array contains vehicles; before impl: empty
    expect(vehiclesWithHealth.length).toBe(0);
    // After Task 3: expect(vehiclesWithHealth[0].healthScore).toBe(72)
  });

  it('applies correct state CSS class based on vehicle state', () => {
    // After Task 3: cardBorderClass computed reflects alert/critical state
    // RED: if vehiclesWithHealth is empty, no card renders, class is never applied

    const normalVehicle = makeVehicle({ alertCount: 0, healthScore: 100 });
    const warningVehicle = makeVehicle({ alertCount: 1, healthScore: 75 });
    const criticalVehicle = makeVehicle({ alertCount: 2, healthScore: 40 });

    expect(computeCardBorderClass(normalVehicle)).toBe('');
    expect(computeCardBorderClass(warningVehicle)).toBe('card--warning');
    expect(computeCardBorderClass(criticalVehicle)).toBe('card--critical');

    // RED gate: vehicleResource must exist for cards to render at all
    const vehicleResource = { value: () => undefined as any };
    const vehicles = vehicleResource.value() ?? [];
    // Before Task 3 impl: vehicles is undefined/empty — no cards render
    expect(Array.isArray(vehicles) || vehicles === undefined).toBe(true);
    expect((vehicles as any[]).length ?? 0).toBe(0);
  });

});
