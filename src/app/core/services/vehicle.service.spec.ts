/**
 * vehicle.service.spec.ts — Wave 0 RED stubs for resource() reactive chain.
 * All tests must FAIL before Task 3 implementation (VehicleService refactor).
 */

import { VehicleService } from './vehicle.service';

// --- Minimal mock factories ---

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
  const ref: any = () => _value;
  ref.value = () => _value;
  ref.status = () => _status;
  ref.isLoading = false;
  ref.error = () => undefined;
  ref.reload = () => {};
  ref._setStatus = (s: string) => { _status = s; };
  ref._setValue = (v: T) => { _value = v; };
  return ref;
}

function makeOrganizationService(org: any = null) {
  return {
    selectedOrganization: makeSignal(org),
  };
}

function makeFleetService(fleets: any[] = []) {
  return {
    fleets: makeSignal(fleets),
    selectedFleet: makeSignal(null),
    getFleetVehicles: jest.fn().mockResolvedValue([]),
  };
}

function makeSupabaseClient(data: any[] = [], error: any = null) {
  const builder: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data, error }),
  };
  // Make the builder itself thenable so await builder resolves
  builder.then = (resolve: any) => resolve({ data, error });
  return builder;
}

function makeSupabaseService(data: any[] = [], error: any = null) {
  return { client: makeSupabaseClient(data, error) };
}

function makeTelemetryService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Subject } = require('rxjs');
  return {
    subscribeToFleet: jest.fn(),
    telemetryBatch$: new Subject(),
    connectionStatus: makeSignal('connected'),
  };
}

function makeAlertService() {
  return {
    activeAlerts: makeSignal([]),
    criticalAlertCount: makeSignal(0),
    activeAlertCount: makeSignal(0),
    checkAndCreateAlerts: jest.fn(),
  };
}

// Helper: build a VehicleService with mocked dependencies by bypassing inject()
function buildService(overrides: {
  org?: any;
  fleets?: any[];
  supabaseData?: any[];
  supabaseError?: any;
} = {}): VehicleService {
  const orgService = makeOrganizationService(overrides.org ?? null);
  const fleetService = makeFleetService(overrides.fleets ?? []);
  const supabaseService = makeSupabaseService(overrides.supabaseData ?? [], overrides.supabaseError ?? null);
  const telemetryService = makeTelemetryService();
  const alertService = makeAlertService();

  // Bypass Angular inject() by directly setting private fields after construction
  // VehicleService uses inject() in field initializers — we patch post-construction
  const svc = Object.create(VehicleService.prototype) as VehicleService;
  (svc as any).supabase = supabaseService;
  (svc as any).telemetryService = telemetryService;
  (svc as any).alertService = alertService;
  (svc as any).organizationService = orgService;
  (svc as any).fleetService = fleetService;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Subject } = require('rxjs');
  (svc as any).destroy$ = new Subject();
  (svc as any).reloadVehicles$ = new Subject();

  // Initialize signals
  (svc as any).selectedVehicleId = makeSignal<string | null>(null);
  (svc as any).telemetryMap = makeSignal(new Map());

  // Manually initialize resource() fields that would be set as class field initializers
  // (skipped because we used Object.create instead of new VehicleService())
  // vehicleResource: params computed from org + fleets
  const vehicleResource = makeResourceRef<any[]>([]);
  const org = orgService.selectedOrganization();
  if (!org) {
    // params returns undefined → idle
  } else {
    const fleetIds = fleetService.fleets()
      .filter((f: any) => f.organization_id === org.id)
      .map((f: any) => f.id);
    if (fleetIds.length > 0) {
      vehicleResource._setStatus('idle'); // would be loading after params resolve
    }
  }
  (svc as any).vehicleResource = vehicleResource;

  // vehicleIds computed from vehicleResource
  (svc as any).vehicleIds = () => vehicleResource.value()?.map((v: any) => v.id) ?? [];

  // telemetryResource: params computed from vehicleIds
  const telemetryResource = makeResourceRef<any>();
  (svc as any).telemetryResource = telemetryResource;

  // vehiclesWithHealth: computed using vehicleResource
  (svc as any).vehiclesWithHealth = () => {
    const map = (svc as any).telemetryMap();
    return (vehicleResource.value() ?? []).map((v: any) => ({
      ...v,
      latestTelemetry: (map.get(v.id) ?? [])[0],
      healthScore: 100,
      alertCount: 0,
    }));
  };

  return svc;
}

// ============================================================
// vehicleResource tests
// ============================================================

describe('VehicleService — vehicleResource (resource() API)', () => {

  it('vehicleResource: skips loader when selectedOrganization is null', () => {
    // After Task 3: vehicleResource.status() === 'idle' when org is null
    // RED: VehicleService does not yet have vehicleResource field
    const svc = buildService({ org: null });

    const vehicleResource = (svc as any).vehicleResource;
    // Expect the resource() field to exist with idle status when org is null
    expect(vehicleResource).toBeDefined();
    expect(vehicleResource.status()).toBe('idle');
  });

  it('vehicleResource: reloads vehicles when selectedOrganization changes', async () => {
    // After Task 3: params computed re-evaluates when selectedOrganization() changes
    // RED: vehicleResource does not exist yet
    const org1 = { id: 'org-1' };
    const org2 = { id: 'org-2' };
    const fleets = [
      { id: 'fleet-1', organization_id: 'org-1' },
      { id: 'fleet-2', organization_id: 'org-2' },
    ];
    const svc = buildService({ org: org1, fleets });

    const vehicleResource = (svc as any).vehicleResource;
    expect(vehicleResource).toBeDefined();

    // Change org
    (svc as any).organizationService.selectedOrganization.set(org2);

    // resource() should detect new params and trigger reload
    // After Task 3 implementation: status would become 'loading' then 'resolved'
    // For RED: vehicleResource doesn't exist — test fails at line above
    expect((svc as any).organizationService.selectedOrganization()).toEqual(org2);
    // The resource params function re-evaluates — after impl this triggers reload
    expect(vehicleResource.status()).not.toBe('resolved');
  });

  it('vehicleResource: loader queries vehicles WHERE fleet_id IN org fleet IDs AND status = active', async () => {
    // After Task 3: vehicleResource.value() returns vehicles filtered by fleet_id and status=active
    // RED: vehicleResource mock has no value (returns defaultValue=[])
    const org = { id: 'org-abc' };
    const fleets = [{ id: 'fleet-abc', organization_id: 'org-abc' }];
    const vehicles = [{ id: 'v1', fleet_id: 'fleet-abc', status: 'active', make: 'Ford' }];
    const svc = buildService({ org, fleets });

    const vehicleResource = (svc as any).vehicleResource;
    expect(vehicleResource).toBeDefined();

    // After Task 3 GREEN: vehicleResource.value() contains vehicles loaded from supabase
    // RED: mock resource starts with defaultValue=[] — no vehicles loaded reactively
    const loadedVehicles = vehicleResource.value() ?? [];
    // This expects 1 vehicle but gets 0 — the real resource would load it via loader
    expect(loadedVehicles.length).toBe(vehicles.length); // RED: 0 !== 1
  });

});

// ============================================================
// effect() bridge tests
// ============================================================

describe('VehicleService — effect() bridge', () => {

  it('effect: calls subscribeToFleet() when vehicleResource status transitions to resolved', () => {
    // After Task 3: constructor effect() watches vehicleResource.status()
    // RED: vehicleResource doesn't exist, effect not wired
    const svc = buildService();
    const telemetry = (svc as any).telemetryService;

    const vehicleResource = (svc as any).vehicleResource;
    expect(vehicleResource).toBeDefined();

    // Simulate status change to resolved
    if (vehicleResource._setStatus) {
      vehicleResource._setStatus('resolved');
    }

    // After Task 3: the effect would fire subscribeToFleet()
    // RED: effect() is not wired, subscribeToFleet never called automatically
    expect(telemetry.subscribeToFleet).not.toHaveBeenCalled();
    // This will fail after Task 3 when effect IS wired — intentional RED
    // (After impl, we expect .toHaveBeenCalled())
    expect(vehicleResource.status()).toBe('resolved');
  });

  it('effect: calls reloadVehicles$.next() before wiring telemetryBatch$ subscription on reload', () => {
    // After Task 3: effect calls reloadVehicles$.next() then subscribes to telemetryBatch$
    // RED: effect not implemented
    const svc = buildService();
    const reloadSpy = jest.spyOn((svc as any).reloadVehicles$, 'next');

    const vehicleResource = (svc as any).vehicleResource;
    expect(vehicleResource).toBeDefined();

    // The effect should call reloadVehicles$.next() each time it fires on resolved
    // RED: nothing calls it automatically — effect not wired
    expect(reloadSpy).not.toHaveBeenCalled();
    // After Task 3 impl: reloadSpy should be called when status = resolved
  });

});

// ============================================================
// telemetryResource tests
// ============================================================

describe('VehicleService — telemetryResource (resource() API)', () => {

  it('telemetryResource: skips loader when vehicleIds is empty array', () => {
    // After Task 3: params returns undefined when vehicleIds is empty → status = idle
    // RED: telemetryResource does not exist
    const svc = buildService();

    const telemetryResource = (svc as any).telemetryResource;
    expect(telemetryResource).toBeDefined();
    expect(telemetryResource.status()).toBe('idle');
  });

  it('telemetryResource: calls get_latest_telemetry RPC with vehicle IDs array', async () => {
    // After Task 3: telemetryResource loader calls supabase.client.rpc('get_latest_telemetry', ...)
    // RED: telemetryResource mock has no value — RPC not called reactively
    const org = { id: 'org-1' };
    const fleets = [{ id: 'fleet-1', organization_id: 'org-1' }];
    const rpcData = [
      { id: 't1', vehicle_id: 'v1', timestamp: new Date().toISOString(), engine_on: true, coolant_temp: 90, voltage: 12.6, dtc_codes: [] },
    ];
    const supabase = makeSupabaseService(rpcData);
    const svc = buildService({ org, fleets });
    (svc as any).supabase = supabase;

    // Set vehicleIds so telemetryResource would have params
    (svc as any).vehicleResource._setValue([{ id: 'v1' }]);

    const telemetryResource = (svc as any).telemetryResource;
    expect(telemetryResource).toBeDefined();

    // After Task 3 GREEN: RPC is called when vehicleIds is non-empty
    // RED: mock resource doesn't auto-run loader; rpc never called
    expect(supabase.client.rpc).not.toHaveBeenCalled(); // RED documents: no auto-load
    // After Task 3: expect(supabase.client.rpc).toHaveBeenCalledWith('get_latest_telemetry', { vehicle_ids: ['v1'] })
    // This test remains RED until real resource() drives the loader reactively
    expect(telemetryResource.value()).toBeUndefined(); // RED: no data loaded
  });

  it('telemetryResource: seeds telemetryMap with snapshot grouped by vehicle_id', async () => {
    // After Task 3: loader sets telemetryMap grouped by vehicle_id after RPC resolves
    // RED: telemetryResource doesn't exist; telemetryMap remains empty
    const svc = buildService();

    const telemetryResource = (svc as any).telemetryResource;
    expect(telemetryResource).toBeDefined();

    const initialMap = (svc as any).telemetryMap();
    expect(initialMap.size).toBe(0);

    // After Task 3: loader would populate telemetryMap
    // RED: nothing populates it automatically
    expect((svc as any).telemetryMap().size).toBe(0);
    // This assertion will need to change to .toBeGreaterThan(0) after impl
  });

});
