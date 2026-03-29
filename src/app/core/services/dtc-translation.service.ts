import { Injectable } from '@angular/core';
import { DtcEntry } from '../models/dtc.model';
import { DTC_DATABASE } from '../../shared/data/dtc-database';

const PREFIXES: Record<string, string> = {
  P: 'Powertrain',
  B: 'Body',
  C: 'Chassis',
  U: 'Network',
};

const SYSTEMS: Record<string, string> = {
  '0': 'Generic',
  '1': 'Fuel & Air Metering',
  '2': 'Fuel & Air Metering (Injector)',
  '3': 'Ignition/Misfire',
  '4': 'Emissions',
  '5': 'Speed/Idle Control',
  '6': 'Computer/Output Circuit',
  '7': 'Transmission',
  '8': 'Transmission (Specific)',
  '9': 'SAE Reserved',
};

@Injectable({ providedIn: 'root' })
export class DtcTranslationService {
  /**
   * Translate a DTC code to a full DtcEntry.
   * Falls back to parsed generic description for unknown codes.
   */
  translate(code: string): DtcEntry {
    const normalized = code.toUpperCase().trim();
    return DTC_DATABASE[normalized] ?? this.parseGeneric(normalized);
  }

  /**
   * Get color for a severity level.
   */
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'var(--color-critical)';
      case 'high':     return 'var(--color-critical)';
      case 'medium':   return 'var(--color-warning)';
      case 'low':      return 'var(--color-healthy)';
      default:         return 'var(--color-text-muted)';
    }
  }

  /**
   * Returns true if this code is in our known database.
   */
  isKnownCode(code: string): boolean {
    return code.toUpperCase().trim() in DTC_DATABASE;
  }

  private parseGeneric(code: string): DtcEntry {
    const prefix = code.charAt(0).toUpperCase();
    const systemChar = code.charAt(1);

    return {
      code,
      category: PREFIXES[prefix] ?? 'Unknown',
      system: SYSTEMS[systemChar] ?? 'Unknown System',
      severity: 'medium',
      description: `Generic ${PREFIXES[prefix] ?? 'Unknown'} fault code`,
      causes: ['Unknown — diagnostic scan recommended'],
      symptoms: ['Check Engine light illuminated'],
      recommendations: 'This code is not in the local database. Professional diagnosis with OBD scanner is recommended.',
    };
  }
}
