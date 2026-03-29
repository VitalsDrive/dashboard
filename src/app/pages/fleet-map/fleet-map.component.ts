import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import * as L from 'leaflet';
import { VehicleService } from '../../core/services/vehicle.service';
import { AlertService } from '../../core/services/alert.service';
import { VehicleWithHealth } from '../../core/models/vehicle.model';
import { VehicleDetailPanelComponent } from './vehicle-detail-panel/vehicle-detail-panel.component';

// Fix Leaflet default marker icon path issue with bundlers
const DEFAULT_ICON = L.icon({
  iconUrl: 'assets/leaflet/marker-icon.png',
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DEFAULT_ICON;

interface VehicleMarkerData {
  marker: L.Marker;
  vehicleId: string;
  lastLat: number;
  lastLng: number;
}

@Component({
  selector: 'app-fleet-map',
  templateUrl: './fleet-map.component.html',
  styleUrl: './fleet-map.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VehicleDetailPanelComponent],
})
export class FleetMapComponent implements AfterViewInit, OnDestroy {
  private readonly vehicleService = inject(VehicleService);
  private readonly alertService = inject(AlertService);

  private map: L.Map | null = null;
  private markerMap = new Map<string, VehicleMarkerData>();
  private updateTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly selectedVehicleId = signal<string | null>(null);
  readonly selectedVehicle = computed(() => {
    const id = this.selectedVehicleId();
    if (!id) return null;
    return this.vehicleService.vehiclesWithHealth().find((v) => v.id === id) ?? null;
  });

  readonly vehicles = this.vehicleService.vehiclesWithHealth;

  constructor() {
    // Watch for telemetry updates and refresh markers (throttled)
    effect(() => {
      const vehicles = this.vehicles();
      if (this.map && vehicles.length > 0) {
        if (this.updateTimeout) clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => this.updateMarkers(vehicles), 1000);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map('fleet-map', {
      center: [32.0853, 34.7818], // Default: Tel Aviv
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Initial marker placement
    this.updateMarkers(this.vehicles());
  }

  private updateMarkers(vehicles: VehicleWithHealth[]): void {
    if (!this.map) return;

    const validVehicles = vehicles.filter(
      (v) =>
        v.latestTelemetry?.latitude != null &&
        v.latestTelemetry?.longitude != null,
    );

    // Update or create markers
    for (const vehicle of validVehicles) {
      const lat = vehicle.latestTelemetry!.latitude!;
      const lng = vehicle.latestTelemetry!.longitude!;
      const existing = this.markerMap.get(vehicle.id);

      if (existing) {
        existing.marker.setLatLng([lat, lng]);
        existing.marker.setIcon(this.getMarkerIcon(vehicle));
      } else {
        const marker = L.marker([lat, lng], {
          icon: this.getMarkerIcon(vehicle),
          title: vehicle.name,
          alt: vehicle.name,
        });

        marker.bindPopup(this.buildPopupContent(vehicle), {
          className: 'vehicle-popup',
          maxWidth: 240,
        });

        marker.on('click', () => {
          this.selectedVehicleId.set(vehicle.id);
        });

        marker.addTo(this.map!);
        this.markerMap.set(vehicle.id, { marker, vehicleId: vehicle.id, lastLat: lat, lastLng: lng });
      }
    }

    // Remove markers for vehicles no longer present
    for (const [id, data] of this.markerMap) {
      if (!validVehicles.find((v) => v.id === id)) {
        data.marker.remove();
        this.markerMap.delete(id);
      }
    }

    // Auto-fit bounds
    if (validVehicles.length > 0) {
      const bounds = L.latLngBounds(
        validVehicles.map((v) => [v.latestTelemetry!.latitude!, v.latestTelemetry!.longitude!]),
      );
      this.map.fitBounds(bounds.pad(0.1));
    }
  }

  private getMarkerIcon(vehicle: VehicleWithHealth): L.DivIcon {
    const state = this.getVehicleState(vehicle);
    const colors: Record<string, string> = {
      offline: '#6b7280',
      running: '#22c55e',
      alert: '#ef4444',
    };
    const color = colors[state] ?? '#6b7280';
    const pulse = state !== 'offline' ? 'pulse' : '';

    return L.divIcon({
      html: `
        <div class="map-marker map-marker--${state} ${pulse}" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" fill="${color}" opacity="0.2"/>
            <circle cx="16" cy="16" r="7" fill="${color}"/>
            <circle cx="16" cy="16" r="3" fill="white"/>
          </svg>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }

  private getVehicleState(vehicle: VehicleWithHealth): 'offline' | 'running' | 'alert' {
    if (vehicle.status === 'offline') return 'offline';
    if (vehicle.alertCount > 0) return 'alert';
    if (vehicle.latestTelemetry?.engine_on) return 'running';
    return 'offline';
  }

  private buildPopupContent(vehicle: VehicleWithHealth): string {
    const temp = vehicle.latestTelemetry?.coolant_temp ?? '--';
    const volt = vehicle.latestTelemetry?.voltage ?? '--';
    return `
      <div style="font-family: var(--font-family); color: #e2e8f0; padding: 4px 0;">
        <strong style="font-size: 14px;">${vehicle.name}</strong>
        <div style="margin-top: 6px; font-size: 12px; color: #9ca3af;">
          <div>Temp: ${temp}°C</div>
          <div>Voltage: ${volt}V</div>
          <div>Health: ${vehicle.healthScore}%</div>
        </div>
      </div>
    `;
  }

  closeDetailPanel(): void {
    this.selectedVehicleId.set(null);
  }
}
