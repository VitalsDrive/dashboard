export interface Fleet {
  id: string;
  name: string;
  owner_id: string;
  provisioning_code: string;
  settings?: {
    timezone?: string;
    data_retention_days?: number;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at?: string;
}

export interface FleetWithStats extends Fleet {
  vehicle_count: number;
  member_count: number;
  active_vehicle_count: number;
}
