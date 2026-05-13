import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class SupabaseService {
  // Base client (anon key only — used before auth)
  private readonly _anonClient: SupabaseClient;
  // Authenticated client (JWT in Authorization header — used after token exchange)
  private _authedClient: SupabaseClient | null = null;

  constructor() {
    this._anonClient = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { apikey: environment.supabase.anonKey } },
      },
    );
  }

  /**
   * Called by AuthService after VD JWT exchange.
   * Creates an authenticated Supabase client that passes the JWT as
   * Authorization header so RLS policies (auth.jwt()->>'sub') resolve correctly.
   */
  setAccessToken(token: string | null): void {
    if (token) {
      this._authedClient = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
    } else {
      this._authedClient = null;
    }
  }

  get client(): SupabaseClient {
    return this._authedClient ?? this._anonClient;
  }
}
