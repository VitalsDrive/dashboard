# VitalsDrive Dashboard

Angular 19/20 real-time fleet health monitoring dashboard.

## Overview

See [docs/PRD-Layer3-Angular-Dashboard.md](../../docs/PRD-Layer3-Angular-Dashboard.md) for full specification.

## Quick Start

```bash
npm install
cp .env.example src/environments/environment.ts
npm start
```

Navigate to http://localhost:4200

## Environment Variables

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'http://localhost:54321',  // Local Supabase
  supabaseAnonKey: 'your-anon-key'
};
```

## Key Components

| Component | Description |
|-----------|-------------|
| `TelemetryService` | Subscribes to Supabase Realtime |
| `FleetMapComponent` | Leaflet.js map with vehicle markers |
| `HealthGaugeComponent` | SVG gauge for coolant temp |
| `BatteryStatusComponent` | Voltage trend visualization |
| `DtcAlertComponent` | Toast notifications for fault codes |

## Features

- Real-time telemetry via Supabase WebSocket
- Live fleet map with pulsing vehicle markers
- Coolant temperature SVG gauge (105°C critical threshold)
- Battery voltage trend with predictive failure
- DTC alert notifications with plain-English explanations

## Development

```bash
npm start              # Start dev server
npm test              # Run unit tests
npm run build         # Production build
```