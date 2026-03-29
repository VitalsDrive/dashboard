export type VehicleStatus = 'pending' | 'active' | 'inactive' | 'maintenance';

export interface Vehicle {
  id: string;
  fleet_id: string;
  vin: string;
  make: string;
  model: string;
  year?: number;
  license_plate?: string;
  status: VehicleStatus;
  device_id?: string;
  last_seen?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface VehicleWithHealth extends Vehicle {
  latestTelemetry?: import('./telemetry.model').TelemetryRecord;
  healthScore: number;
  alertCount: number;
}

export function getVehicleDisplayName(vehicle: Vehicle): string {
  return `${vehicle.year ? vehicle.year + ' ' : ''}${vehicle.make} ${vehicle.model}`.trim();
}
