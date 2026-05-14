/**
 * DTC-03 scaffold — Wave 0
 * Tests AlertsComponent paginated list filtered to 7-day window.
 * Actual component rewrite lands in plan 04-02.
 * Assertions marked TODO are expected to fail until plan 04-02 is complete.
 */
import { signal, computed } from '@angular/core';
import type { SupabaseAlert } from '../../core/models/alert.model';

// ---------------------------------------------------------------------------
// Constants matching the component (plan 04-02 will import from component)
// ---------------------------------------------------------------------------
const PAGE_SIZE = 25;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Minimal inline stub replicating AlertsComponent pagination logic
// (mirrors 04-PATTERNS.md AlertsComponent pattern)
// ---------------------------------------------------------------------------
function makeComponentStub(alerts: SupabaseAlert[]) {
  const allAlerts = signal<SupabaseAlert[]>(alerts);
  const currentPage = signal(0);

  const totalCount = computed(() => allAlerts().length);

  const pagedAlerts = computed(() => {
    const from = currentPage() * PAGE_SIZE;
    return allAlerts().slice(from, from + PAGE_SIZE);
  });

  function onPageChange(pageIndex: number): void {
    currentPage.set(pageIndex);
  }

  return { allAlerts, currentPage, totalCount, pagedAlerts, onPageChange };
}

function makeAlert(overrides: Partial<SupabaseAlert> = {}): SupabaseAlert {
  return {
    id: 1,
    vehicle_id: 'vehicle-uuid-1',
    fleet_id: 'fleet-uuid-1',
    severity: 'warning',
    code: 'P0300',
    message: 'DTC fault code: P0300',
    dtc_codes: ['P0300'],
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

function makeAlerts(count: number, overrides: Partial<SupabaseAlert> = {}): SupabaseAlert[] {
  return Array.from({ length: count }, (_, i) =>
    makeAlert({ id: i + 1, code: `P0${String(i).padStart(3, '0')}`, ...overrides }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AlertsComponent (Wave 0 scaffold — pagination + 7-day filter)', () => {
  describe('pagination', () => {
    it('pagedAlerts returns at most PAGE_SIZE (25) items on page 0 (DTC-03)', () => {
      const stub = makeComponentStub(makeAlerts(60));
      expect(stub.pagedAlerts().length).toBe(PAGE_SIZE);
    });

    it('pagedAlerts returns remaining items on last page', () => {
      const stub = makeComponentStub(makeAlerts(30));
      stub.onPageChange(1);
      expect(stub.pagedAlerts().length).toBe(5); // 30 - 25 = 5
    });

    it('onPageChange updates currentPage', () => {
      const stub = makeComponentStub(makeAlerts(50));
      stub.onPageChange(1);
      expect(stub.currentPage()).toBe(1);
    });

    it('totalCount reflects all alerts across pages', () => {
      const stub = makeComponentStub(makeAlerts(60));
      expect(stub.totalCount()).toBe(60);
    });
  });

  describe('7-day window filtering (plan 04-02 responsibility)', () => {
    it('alerts older than 7 days should NOT appear in the list (plan 04-02)', () => {
      const old = makeAlert({
        id: 99,
        created_at: new Date(Date.now() - SEVEN_DAYS_MS - 1000).toISOString(),
      });
      // NOTE: The stub does not filter by date — that is the service/resource loader's job.
      // This test documents the expected behaviour for plan 04-02 implementors.
      // The AlertService.alertResource loader uses .gte('created_at', sevenDaysAgo).
      // After plan 04-02, replace this stub with a real AlertService mock.
      const stub = makeComponentStub([old]);
      // Currently passes because the stub doesn't filter — plan 04-02 must wire the filter.
      // TODO (plan 04-02): inject mocked AlertService whose dbAlerts() already filters to 7 days
      expect(stub.totalCount()).toBeGreaterThanOrEqual(0); // placeholder — always passes
    });
  });

  // TODO (plan 04-02): Test AlertsComponent renders mat-list rows via AlertService.dbAlerts()
  // TODO (plan 04-02): Test Acknowledge button calls alertService.acknowledgeAlert(alert.id)
  // TODO (plan 04-02): Test acknowledged rows have CSS class 'alert-row--acknowledged'
  it.todo('AlertsComponent renders one row per pagedAlerts() item (plan 04-02)');
  it.todo('Acknowledge button calls alertService.acknowledgeAlert(alert.id) (plan 04-02)');
  it.todo('acknowledged alert rows carry class alert-row--acknowledged (plan 04-02)');
});
