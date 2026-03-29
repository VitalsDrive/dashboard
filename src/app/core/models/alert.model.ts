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
