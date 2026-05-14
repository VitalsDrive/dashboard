export type AlertType = 'dtc' | 'battery' | 'coolant' | 'connection';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'dismissed' | 'resolved';

export interface Alert {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  type: AlertType;
  severity: AlertSeverity;
  code?: string;          // For DTC alerts
  message: string;
  timestamp: Date;
  status: AlertStatus;
  metadata?: Record<string, unknown>;
}

export const ALERT_AUTO_DISMISS: Record<AlertSeverity, number> = {
  critical: 0,      // No auto-dismiss
  warning: 12000,   // 12 seconds
  info: 8000,       // 8 seconds
};

/** Row shape returned by Supabase from the alerts table (snake_case). */
export interface SupabaseAlert {
  id: number;                    // BIGSERIAL — integer, NOT UUID
  vehicle_id: string;
  fleet_id: string;
  severity: AlertSeverity;
  code: string;
  message: string;
  dtc_codes: string[] | null;
  lat: number | null;
  lng: number | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  resolved_at: string | null;
}
