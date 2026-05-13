const w = (typeof window !== 'undefined' ? window : {}) as any;
const env = w.__env ?? {};

export const environment = {
  production: true,
  supabase: {
    url: env.supabaseUrl ?? 'https://odwctmlawibhaclptsew.supabase.co',
    anonKey: env.supabaseAnonKey ?? '',
  },
  authServiceUrl: env.authServiceUrl ?? '',
  auth0: {
    domain: env.auth0Domain ?? '',
    clientId: env.auth0ClientId ?? '',
    audience: env.auth0Audience ?? '',
  },
};
