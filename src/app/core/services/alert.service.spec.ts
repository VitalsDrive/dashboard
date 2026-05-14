/**
 * BATT-02 / COOL-02 scaffold — Wave 0
 * Tests AlertService.unacknowledgedCount reacting to Realtime INSERT events.
 * Actual implementation lands in plan 04-02 (AlertService Supabase refactor).
 * All assertions marked TODO are expected to fail until plan 04-02 is complete.
 */
import { signal, computed } from '@angular/core';
import type { SupabaseAlert } from '../models/alert.model';

// ---------------------------------------------------------------------------
// Minimal inline stub for AlertService post-04-02 refactor
// (mirrors the pattern documented in 04-PATTERNS.md)
// ---------------------------------------------------------------------------
function makeAlertServiceStub() {
  const _dbAlerts = signal<SupabaseAlert[]>([]);
  const dbAlerts = _dbAlerts.asReadonly();
  const unacknowledgedCount = computed(() =>
    _dbAlerts().filter((a) => !a.acknowledged).length,
  );
  const activeDbAlerts = computed(() =>
    _dbAlerts().filter((a) => !a.acknowledged),
  );

  function simulateRealtimeInsert(alert: SupabaseAlert): void {
    _dbAlerts.update((alerts) => [alert, ...alerts]);
  }

  return { dbAlerts, unacknowledgedCount, activeDbAlerts, simulateRealtimeInsert, _dbAlerts };
}

function makeAlert(overrides: Partial<SupabaseAlert> = {}): SupabaseAlert {
  return {
    id: 1,
    vehicle_id: 'vehicle-uuid-1',
    fleet_id: 'fleet-uuid-1',
    severity: 'warning',
    code: 'BATTERY_WARNING',
    message: 'Battery low: 11.7V',
    dtc_codes: null,
    lat: null,
    lng: null,
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AlertService (Wave 0 scaffold — unacknowledgedCount)', () => {
  it('unacknowledgedCount starts at 0 with no alerts', () => {
    const svc = makeAlertServiceStub();
    expect(svc.unacknowledgedCount()).toBe(0);
  });

  it('unacknowledgedCount increments when a BATTERY_WARNING alert is inserted (BATT-02)', () => {
    const svc = makeAlertServiceStub();
    svc.simulateRealtimeInsert(makeAlert({ code: 'BATTERY_WARNING', severity: 'warning' }));
    expect(svc.unacknowledgedCount()).toBe(1);
  });

  it('unacknowledgedCount increments when a COOLANT_WARNING alert is inserted (COOL-02)', () => {
    const svc = makeAlertServiceStub();
    svc.simulateRealtimeInsert(makeAlert({ code: 'COOLANT_WARNING', severity: 'warning' }));
    expect(svc.unacknowledgedCount()).toBe(1);
  });

  it('acknowledged alerts do not count toward unacknowledgedCount', () => {
    const svc = makeAlertServiceStub();
    svc.simulateRealtimeInsert(makeAlert({ acknowledged: true }));
    expect(svc.unacknowledgedCount()).toBe(0);
  });

  it('activeDbAlerts excludes acknowledged rows', () => {
    const svc = makeAlertServiceStub();
    svc.simulateRealtimeInsert(makeAlert({ id: 1, acknowledged: false }));
    svc.simulateRealtimeInsert(makeAlert({ id: 2, acknowledged: true }));
    expect(svc.activeDbAlerts().length).toBe(1);
    expect(svc.activeDbAlerts()[0].id).toBe(1);
  });

  // TODO (plan 04-02): Test that AlertService.alertResource loader calls supabase.from('alerts')
  // TODO (plan 04-02): Test that Realtime INSERT from supabase channel updates _dbAlerts signal
  // TODO (plan 04-02): Test acknowledgeAlert() calls supabase UPDATE and flips acknowledged optimistically
  it.todo('AlertService.alertResource calls supabase.from("alerts") with correct fleet filter (plan 04-02)');
  it.todo('Realtime INSERT via supabase channel increments unacknowledgedCount (plan 04-02)');
  it.todo('acknowledgeAlert(id) sends UPDATE and flips acknowledged optimistically (plan 04-02)');
});
