import { Injectable, signal, computed } from "@angular/core";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment.development";

@Injectable({ providedIn: "root" })
export class SupabaseService {
  private readonly _client: SupabaseClient;

  readonly currentUser = signal<User | null>(null);
  readonly isLoading = signal(true);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    this._client = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            apikey: environment.supabase.anonKey,
          },
        },
      },
    );

    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      const { data } = await this._client.auth.getSession();
      if (data?.session?.user) {
        this.currentUser.set(data.session.user);
      }
    } finally {
      this.isLoading.set(false);
    }

    this._client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        this.currentUser.set(session.user);
      } else if (event === "SIGNED_OUT") {
        this.currentUser.set(null);
      }
    });
  }

  getClient(): SupabaseClient {
    return this._client;
  }

  get client(): SupabaseClient {
    return this._client;
  }
}
