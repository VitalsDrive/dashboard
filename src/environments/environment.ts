export const environment = {
  production: true,
  supabaseUrl: 'http://localhost:54321',
  supabaseAnonKey: 'your-local-anon-key',
  // SECURITY: Never commit real Supabase anon keys to source control.
  // Set SUPABASE_ANON_KEY at build time via environment injection or replace
  // this placeholder before deploying. The key below is intentionally invalid.
  supabase: {
    url: 'https://odwctmlawibhaclptsew.supabase.co',
    anonKey: 'REPLACE_WITH_SUPABASE_ANON_KEY',
  },
  authServiceUrl: 'https://YOUR_RAILWAY_AUTH_SERVICE_URL',
  auth0: {
    domain: 'ronbiter.auth0.com',
    clientId: 'vlGLhmcqPYQWjWrHzC49fwYnJ54Segmk',
    audience: 'https://ronbiter.auth0.com/api/v2/',
  },
};
