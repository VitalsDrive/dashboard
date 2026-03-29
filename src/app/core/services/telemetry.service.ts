import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Subject, ReplaySubject } from 'rxjs';
import { bufferTime, filter, takeUntil } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { TelemetryRecord, ConnectionStatus } from '../models/telemetry.model';
import type { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class TelemetryService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly destroy$ = new Subject<void>();

  /** Raw stream of individual telemetry records as they arrive */
  private readonly channel$ = new ReplaySubject<TelemetryRecord>(100);
  readonly telemetry$ = this.channel$.asObservable();

  /** Batched stream — emits every 500ms with all records received in that window */
  readonly telemetryBatch$ = this.telemetry$.pipe(
    bufferTime(500),
    filter((batch) => batch.length > 0),
    takeUntil(this.destroy$),
  );

  readonly connectionStatus = signal<ConnectionStatus>('disconnected');

  private fleetChannel: RealtimeChannel | null = null;
  private vehicleChannels = new Map<string, RealtimeChannel>();

  /**
   * Subscribe to all fleet telemetry via Supabase Realtime.
   * Call once on app init (VehicleService bootstraps this).
   */
  subscribeToFleet(): void {
    if (this.fleetChannel) return;

    this.connectionStatus.set('reconnecting');

    this.fleetChannel = this.supabase.client
      .channel('fleet-telemetry')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telemetry_logs' },
        (payload) => {
          const record = this.mapPayload(payload.new);
          if (record) this.channel$.next(record);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.connectionStatus.set('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.connectionStatus.set('disconnected');
        } else if (status === 'CLOSED') {
          this.connectionStatus.set('disconnected');
        }
      });
  }

  /**
   * Subscribe to a specific vehicle's telemetry.
   * Returns a cleanup function.
   */
  subscribeToVehicle(vehicleId: string): () => void {
    if (this.vehicleChannels.has(vehicleId)) {
      return () => this.unsubscribeFromVehicle(vehicleId);
    }

    const channel = this.supabase.client
      .channel(`vehicle-${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry_logs',
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        (payload) => {
          const record = this.mapPayload(payload.new);
          if (record) this.channel$.next(record);
        },
      )
      .subscribe();

    this.vehicleChannels.set(vehicleId, channel);
    return () => this.unsubscribeFromVehicle(vehicleId);
  }

  private unsubscribeFromVehicle(vehicleId: string): void {
    const channel = this.vehicleChannels.get(vehicleId);
    if (channel) {
      this.supabase.client.removeChannel(channel);
      this.vehicleChannels.delete(vehicleId);
    }
  }

  private mapPayload(raw: Record<string, unknown>): TelemetryRecord | null {
    if (!raw || !raw['vehicle_id']) return null;
    return {
      id: raw['id'] as string | undefined,
      vehicle_id: raw['vehicle_id'] as string,
      timestamp: (raw['timestamp'] as string) ?? new Date().toISOString(),
      rpm: raw['rpm'] as number | undefined,
      speed: raw['speed'] as number | undefined,
      engine_on: Boolean(raw['engine_on']),
      coolant_temp: Number(raw['coolant_temp'] ?? 0),
      voltage: Number(raw['voltage'] ?? 0),
      latitude: raw['latitude'] as number | undefined,
      longitude: raw['longitude'] as number | undefined,
      dtc_codes: (raw['dtc_codes'] as string[]) ?? [],
      fuel_level: raw['fuel_level'] as number | undefined,
      signal_strength: raw['signal_strength'] as number | undefined,
      raw_packet: raw['raw_packet'] as string | undefined,
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.fleetChannel) {
      this.supabase.client.removeChannel(this.fleetChannel);
    }
    this.vehicleChannels.forEach((ch) => {
      this.supabase.client.removeChannel(ch);
    });
  }
}
