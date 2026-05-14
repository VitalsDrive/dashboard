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

  // One Broadcast channel per fleet — avoids postgres_changes JWT/RLS issue
  private fleetChannels: RealtimeChannel[] = [];
  private vehicleChannels = new Map<string, RealtimeChannel>();

  /**
   * Subscribe to live telemetry via per-fleet Broadcast channels.
   * DB trigger (017) calls realtime.send() with private=false on each INSERT.
   */
  subscribeToFleet(fleetIds: string[]): void {
    if (this.fleetChannels.length > 0) return;

    this.connectionStatus.set('reconnecting');

    this.fleetChannels = fleetIds.map((fleetId) =>
      this.supabase.client
        .channel(`telemetry:${fleetId}`)
        .on('broadcast', { event: 'new-telemetry' }, (message: { payload: unknown }) => {
          const record = this.mapPayload(message.payload as Record<string, unknown>);
          if (record) this.channel$.next(record);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') this.connectionStatus.set('connected');
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') this.connectionStatus.set('disconnected');
          else if (status === 'CLOSED') this.connectionStatus.set('disconnected');
        })
    );
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
    const rpm = raw['rpm'] as number | undefined;
    return {
      id: raw['id'] as string | undefined,
      vehicle_id: raw['vehicle_id'] as string,
      timestamp: (raw['timestamp'] as string) ?? new Date().toISOString(),
      rpm,
      speed: raw['speed'] as number | undefined,
      engine_on: Boolean(raw['engine_on'] ?? (rpm != null && rpm > 0)),
      coolant_temp: Number(raw['coolant_temp'] ?? raw['temp'] ?? 0),
      voltage: Number(raw['voltage'] ?? 0),
      // DB columns are lat/lng; model uses latitude/longitude
      latitude: (raw['latitude'] ?? raw['lat']) as number | undefined,
      longitude: (raw['longitude'] ?? raw['lng']) as number | undefined,
      dtc_codes: (raw['dtc_codes'] as string[]) ?? [],
      fuel_level: raw['fuel_level'] as number | undefined,
      signal_strength: raw['signal_strength'] as number | undefined,
      raw_packet: raw['raw_packet'] as string | undefined,
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    for (const ch of this.fleetChannels) {
      this.supabase.client.removeChannel(ch);
    }
    this.vehicleChannels.forEach((ch) => {
      this.supabase.client.removeChannel(ch);
    });
  }
}
