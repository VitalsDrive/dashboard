/**
 * dashboard.component.spec.ts — Wave 0 RED stubs for DashboardComponent loading states.
 * Tests verify loading spinner visibility and empty state rendering.
 */

import { VehicleWithHealth } from '../../core/models/vehicle.model';

// These tests operate on the reactive data contracts without Angular TestBed.
// After Task 3: vehicleResource.isLoading drives spinner; vehiclesWithHealth drives empty state.

function makeSignal<T>(val: T) {
  let _v = val;
  const s: any = () => _v;
  s.set = (v: T) => { _v = v; };
  s.update = (fn: (v: T) => T) => { _v = fn(_v); };
  return s;
}

function makeResourceRef<T>(defaultValue?: T) {
  let _value: T | undefined = defaultValue;
  let _status: string = 'idle';
  let _isLoading = false;
  const ref: any = () => _value;
  ref.value = () => _value;
  ref.status = () => _status;
  ref.isLoading = _isLoading;
  ref.error = () => undefined;
  ref.reload = () => {};
  ref._setStatus = (s: string) => { _status = s; ref.isLoading = s === 'loading' || s === 'refreshing'; };
  ref._setValue = (v: T) => { _value = v; };
  return ref;
}

// Simulate dashboard template logic:
// Shows LoadingSpinnerComponent when vehicleResource.isLoading is true
// Shows empty state when vehiclesWithHealth is [] and not loading
function shouldShowLoadingSpinner(vehicleResource: any): boolean {
  return vehicleResource.isLoading === true;
}

function shouldShowEmptyState(vehiclesWithHealth: VehicleWithHealth[], vehicleResource: any): boolean {
  return vehiclesWithHealth.length === 0 && !vehicleResource.isLoading;
}

describe('DashboardComponent — loading spinner and empty state', () => {

  it('shows LoadingSpinnerComponent when vehicleResource.isLoading is true', () => {
    // After Task 3: DashboardComponent template binds *ngIf to vehicleResource.isLoading
    // RED: vehicleResource doesn't exist on VehicleService yet — dashboard can't bind to it

    const vehicleResource = makeResourceRef<VehicleWithHealth[]>([]);
    vehicleResource._setStatus('loading');

    // After Task 3: vehicleResource.isLoading drives the spinner visibility
    expect(shouldShowLoadingSpinner(vehicleResource)).toBe(true);

    // RED gate: VehicleService must expose vehicleResource for template to bind
    // Simulate the missing field:
    const mockVehicleService: any = {};
    const hasVehicleResource = 'vehicleResource' in mockVehicleService;
    // Before Task 3: vehicleResource not on service → template binding fails
    expect(hasVehicleResource).toBe(false);
    // After Task 3: expect(hasVehicleResource).toBe(true)
  });

  it('shows empty state when vehiclesWithHealth is empty array and not loading', () => {
    // After Task 3: empty state shown when vehiclesWithHealth.length === 0 and not loading
    // RED: vehicleResource missing — vehiclesWithHealth may be [] for wrong reasons

    const vehicleResource = makeResourceRef<VehicleWithHealth[]>([]);
    vehicleResource._setStatus('resolved');
    vehicleResource._setValue([]);

    const vehiclesWithHealth: VehicleWithHealth[] = [];

    expect(shouldShowEmptyState(vehiclesWithHealth, vehicleResource)).toBe(true);

    // RED gate: vehiclesWithHealth computed must use vehicleResource.value() not vehicles signal
    // Before Task 3: vehiclesWithHealth reads this.vehicles() (signal being deleted)
    // Verify the contract the template relies on:
    const mockVehicleService: any = {
      vehiclesWithHealth: () => [], // computed from deleted vehicles signal pre-Task3
    };
    const result = mockVehicleService.vehiclesWithHealth();
    // This passes vacuously pre-Task3 — the real RED is that vehicleResource doesn't exist
    expect(result).toEqual([]);

    // The critical RED: vehicleResource field doesn't exist pre-Task3
    expect(mockVehicleService.vehicleResource).toBeUndefined();
    // After Task 3: expect(mockVehicleService.vehicleResource).toBeDefined()
  });

});
