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
import { VehicleWithHealth, getVehicleDisplayName } from '../../core/models/vehicle.model';
import { VehicleDetailPanelComponent } from './vehicle-detail-panel/vehicle-detail-panel.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

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
  imports: [VehicleDetailPanelComponent, LoadingSpinnerComponent],
})
export class FleetMapComponent implements AfterViewInit, OnDestroy {
  protected readonly vehicleService = inject(VehicleService);
  private readonly alertService = inject(AlertService);

  private map: L.Map | null = null;
  private markerMap = new Map<string, VehicleMarkerData>();
  private updateTimeout: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private initialFitDone = false;

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
      if (this.map) {
        if (this.updateTimeout) clearTimeout(this.updateTimeout);
        // updateMarkers([]) correctly removes stale markers when fleet empties.
        this.updateTimeout = setTimeout(() => this.updateMarkers(vehicles), 1000);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    // ResizeObserver fires when the container reaches its actual rendered size —
    // more reliable than setTimeout since Angular's flex layout finalizes asynchronously.
    const container = document.getElementById('fleet-map');
    if (container) {
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(container);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map('fleet-map', {
      center: [32.0853, 34.7818], // Default: Tel Aviv
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Initial marker placement — only once the vehicle resource has resolved,
    // so initialFitDone isn't burned on a transient pre-resolution snapshot (WR-05).
    if (this.vehicleService.vehicleResource.status() === 'resolved') {
      this.updateMarkers(this.vehicles());
    }
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
        this.applyStaleTooltip(existing.marker, vehicle);
      } else {
        const marker = L.marker([lat, lng], {
          icon: this.getMarkerIcon(vehicle),
          title: getVehicleDisplayName(vehicle),
          alt: getVehicleDisplayName(vehicle),
        });

        marker.bindPopup(this.buildPopupContent(vehicle), {
          className: 'vehicle-popup',
          maxWidth: 240,
        });

        marker.on('click', () => {
          this.selectedVehicleId.set(vehicle.id);
        });

        marker.addTo(this.map!);
        this.applyStaleTooltip(marker, vehicle);
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

    // Auto-fit bounds — only on first load to avoid re-centering on telemetry updates
    if (validVehicles.length > 0 && !this.initialFitDone) {
      const bounds = L.latLngBounds(
        validVehicles.map((v) => [v.latestTelemetry!.latitude!, v.latestTelemetry!.longitude!]),
      );
      this.map.fitBounds(bounds.pad(0.1));
      this.initialFitDone = true;
    }
  }

  private applyStaleTooltip(marker: L.Marker, vehicle: VehicleWithHealth): void {
    const state = this.getVehicleState(vehicle);
    if (state === 'stale') {
      const minsAgo = Math.floor(
        (Date.now() - new Date(vehicle.latestTelemetry!.timestamp).getTime()) / 60000,
      );
      marker.bindTooltip(`Last seen ${minsAgo} min ago`, { permanent: false });
    } else {
      marker.unbindTooltip();
    }
  }

  private getMarkerColor(vehicle: VehicleWithHealth): string {
    const state = this.getVehicleState(vehicle);
    if (state === 'stale' || state === 'offline') return '#5a4530';
    if (state === 'running') return '#84cc16';
    // state === 'alert': determine severity from activeDbAlerts
    const vehicleAlerts = this.alertService.activeDbAlerts()
      .filter((a) => a.vehicle_id === vehicle.id);
    const hasCritical = vehicleAlerts.some((a) => a.severity === 'critical');
    return hasCritical ? '#ef4444' : '#eab308'; // red : yellow
  }

  private getMarkerIcon(vehicle: VehicleWithHealth): L.DivIcon {
    const state = this.getVehicleState(vehicle);
    const color = this.getMarkerColor(vehicle);
    const opacity = state === 'stale' ? '0.5' : '1';
    const pulse = (state === 'running' || state === 'alert') ? 'pulse' : '';

    return L.divIcon({
      html: `
        <div class="map-marker map-marker--${state} ${pulse}" style="opacity:${opacity}" aria-hidden="true">
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

  private getVehicleState(vehicle: VehicleWithHealth): 'stale' | 'offline' | 'running' | 'alert' {
    const ts = vehicle.latestTelemetry?.timestamp;
    if (ts && Date.now() - new Date(ts).getTime() > 15 * 60 * 1000) return 'stale';
    if (vehicle.status === 'inactive') return 'offline';
    if (vehicle.alertCount > 0) return 'alert';
    if (vehicle.latestTelemetry?.engine_on) return 'running';
    return 'offline';
  }

  private escapeHtml(value: unknown): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private buildPopupContent(vehicle: VehicleWithHealth): string {
    const temp = vehicle.latestTelemetry?.coolant_temp ?? '--';
    const volt = vehicle.latestTelemetry?.voltage ?? '--';
    const name = this.escapeHtml(getVehicleDisplayName(vehicle));
    return `
      <div style="font-family: var(--font-family); color: #e2e8f0; padding: 4px 0;">
        <strong style="font-size: 14px;">${name}</strong>
        <div style="margin-top: 6px; font-size: 12px; color: #9ca3af;">
          <div>Temp: ${this.escapeHtml(temp)}°C</div>
          <div>Voltage: ${this.escapeHtml(volt)}V</div>
          <div>Health: ${vehicle.healthScore}%</div>
        </div>
      </div>
    `;
  }

  closeDetailPanel(): void {
    this.selectedVehicleId.set(null);
  }
}
