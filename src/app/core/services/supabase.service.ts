import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly _client: SupabaseClient;

  constructor() {
    this._client = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        realtime: {
          params: {
            apikey: environment.supabase.anonKey,
          },
        },
      },
    );
  }

  get client(): SupabaseClient {
    return this._client;
  }
}
