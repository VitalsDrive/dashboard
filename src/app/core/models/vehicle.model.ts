export type VehicleStatus = 'pending' | 'active' | 'inactive' | 'maintenance';

export interface Vehicle {
  id: string;
  fleet_id: string;
  nickname?: string | null;
  vin?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  license_plate?: string | null;
  status: VehicleStatus;
  device_id?: string;
  last_seen?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface CreateVehicleDto {
  nickname: string;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
  vin: string | null;
  fleet_id: string;
}

export interface VehicleWithHealth extends Vehicle {
  latestTelemetry?: import('./telemetry.model').TelemetryRecord;
  healthScore: number;
  alertCount: number;
}

export function getVehicleDisplayName(vehicle: Vehicle): string {
  return `${vehicle.year ? vehicle.year + ' ' : ''}${vehicle.make} ${vehicle.model}`.trim();
}
