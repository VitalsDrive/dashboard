// Development environment — values injected at runtime from src/assets/env.js (gitignored).
// Copy src/assets/env.template.js → src/assets/env.js and fill in real values.
// Never commit real keys here.
const w = (typeof window !== 'undefined' ? window : {}) as any;
const env = w.__env ?? {};

export const environment = {
  production: false,
  supabase: {
    url: env.supabaseUrl ?? 'https://odwctmlawibhaclptsew.supabase.co',
    anonKey: env.supabaseAnonKey ?? '',
  },
  authServiceUrl: env.authServiceUrl ?? 'http://localhost:3001',
  auth0: {
    domain: env.auth0Domain ?? '',
    clientId: env.auth0ClientId ?? '',
    audience: env.auth0Audience ?? '',
  },
};
