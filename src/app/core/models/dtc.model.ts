export type DtcSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DtcEntry {
  code: string;
  category: string;
  system: string;
  severity: DtcSeverity;
  description: string;
  causes: string[];
  symptoms: string[];
  recommendations: string;
}
