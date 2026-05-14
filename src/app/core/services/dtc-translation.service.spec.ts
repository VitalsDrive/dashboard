/**
 * DTC-02 scaffold — Wave 0
 * Tests DtcTranslationService.translate() and isKnownCode() for plan 04-02 to fill in.
 */
import { DtcTranslationService } from './dtc-translation.service';

describe('DtcTranslationService', () => {
  let service: DtcTranslationService;

  beforeEach(() => {
    service = new DtcTranslationService();
  });

  describe('translate()', () => {
    it('returns a non-empty description for known P-code P0100', () => {
      const result = service.translate('P0100');
      expect(result).toBeDefined();
      expect(result.description).toBeTruthy();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('returns a non-empty description for known P-code P0300 (random misfire)', () => {
      const result = service.translate('P0300');
      expect(result).toBeDefined();
      expect(result.description).toBeTruthy();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('returns a generic fallback description for unknown code P9999', () => {
      const result = service.translate('P9999');
      expect(result).toBeDefined();
      expect(result.description).toBeTruthy();
    });

    it('normalises lowercase input — p0100 same result as P0100', () => {
      const upper = service.translate('P0100');
      const lower = service.translate('p0100');
      expect(lower.code).toBe(upper.code);
      expect(lower.description).toBe(upper.description);
    });
  });

  describe('isKnownCode()', () => {
    it('returns true for P0100 (in DTC_DATABASE)', () => {
      expect(service.isKnownCode('P0100')).toBe(true);
    });

    it('returns false for P9999 (not in DTC_DATABASE)', () => {
      expect(service.isKnownCode('P9999')).toBe(false);
    });
  });

  // TODO (plan 04-02): Add tests for all alert-system DTC codes used in smoke tests
  // TODO (plan 04-02): Add tests for DTC codes found in real vehicle telemetry
});
