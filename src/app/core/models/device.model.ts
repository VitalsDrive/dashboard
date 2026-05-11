export type DeviceStatus = 'unassigned' | 'active' | 'inactive';

export interface Device {
  id: string;
  imei: string;
  vehicle_id: string | null;
  fleet_id: string;
  device_type: string;
  is_active: boolean;
  last_seen: string | null;
  status: DeviceStatus;
  created_at: string;
  updated_at: string;
}

export interface DeviceWithDetails extends Device {
  vehicle_name?: string;
  fleet_name?: string;
}

export interface DeviceAssignment {
  id: string;
  device_id: string;
  vehicle_id: string;
  assigned_by: string | null;
  assigned_at: string;
  unassigned_at: string | null;
  notes: string | null;
  vehicle_name?: string;
  vehicle?: { id: string; make: string; model: string; year: number; vin: string };
  assigned_by_email?: string;
}

export interface AssignResult {
  success: boolean;
  error?: 'device_not_found' | 'vehicle_not_found' | 'fleet_mismatch_same_client' | 'fleet_mismatch_different_client' | 'insufficient_permissions';
  device_fleet_id?: string;
  vehicle_fleet_id?: string;
}