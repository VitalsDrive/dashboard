export interface TelemetryRecord {
  id?: string;
  vehicle_id: string;
  timestamp: string;
  // Engine
  rpm?: number;
  speed?: number;
  engine_on: boolean;
  // Temperature
  coolant_temp: number;       // °C
  // Battery
  voltage: number;            // V
  // Location
  latitude?: number;
  longitude?: number;
  // DTCs
  dtc_codes: string[];
  // Fuel
  fuel_level?: number;        // %
  // Metadata
  signal_strength?: number;
  raw_packet?: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
