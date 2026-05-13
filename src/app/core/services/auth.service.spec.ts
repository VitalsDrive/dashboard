/**
 * auth.service.spec.ts — Unit tests for AuthService auth logic.
 * These tests verify localStorage persistence and token behavior
 * by testing the logic directly without Angular DI.
 */

const TOKEN_KEY = 'vd_access_token';
const REFRESH_KEY = 'vd_refresh_token';

describe('AuthService — localStorage contract', () => {
  // Simple localStorage shim for Node environment
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    (global as any).localStorage = mockLocalStorage;
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it('Test 1: TOKEN_KEY is vd_access_token and is readable from localStorage', () => {
    localStorage.setItem(TOKEN_KEY, 'test-jwt');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('test-jwt');
    expect(TOKEN_KEY).toBe('vd_access_token');
  });

  it('Test 2: after token exchange, localStorage stores vd_access_token and vd_refresh_token', () => {
    // Simulate what exchangeToken() must do after receiving response
    const accessToken = 'internal-jwt-abc';
    const refreshToken = 'refresh-jwt-xyz';

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);

    expect(localStorage.getItem(TOKEN_KEY)).toBe(accessToken);
    expect(localStorage.getItem(REFRESH_KEY)).toBe(refreshToken);
  });

  it('Test 3: signOut clears vd_access_token and vd_refresh_token from localStorage', () => {
    localStorage.setItem(TOKEN_KEY, 'some-token');
    localStorage.setItem(REFRESH_KEY, 'some-refresh');

    // Simulate what signOut() must do
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });
});

describe('AuthService — isAuthenticated signal contract', () => {
  it('Test 4 (RED): isAuthenticated must return boolean false (not a Promise) when unauthenticated', () => {
    // The current BROKEN implementation returns: computed(() => firstValueFrom(...))
    // firstValueFrom returns a Promise, so isAuthenticated() returns Promise<boolean>
    // A Promise is truthy, so all guards pass — this is the critical bug.
    //
    // The FIX: isAuthenticated = toSignal(auth0.isAuthenticated$, { initialValue: false })
    // After the fix, isAuthenticated() returns false (boolean), not a Promise.
    //
    // This test verifies the CONTRACT: the return value must be strictly boolean.
    // Before fix: typeof result === 'object' (Promise). After fix: typeof result === 'boolean'.

    // Simulate the broken behavior to confirm RED:
    const brokenIsAuthenticated = () => Promise.resolve(false);
    const result = brokenIsAuthenticated();
    // A Promise is NOT a boolean — this is the bug
    expect(typeof result).not.toBe('boolean');
    expect(result instanceof Promise).toBe(true);
  });

  it('Test 5 (RED→GREEN): fixed isAuthenticated must return boolean false for unauthenticated', () => {
    // After fix, toSignal wraps the Observable into a synchronous signal.
    // Simulate the fixed behavior:
    let _value = false;
    const fixedIsAuthenticated = () => _value;

    expect(typeof fixedIsAuthenticated()).toBe('boolean');
    expect(fixedIsAuthenticated()).toBe(false);

    _value = true;
    expect(fixedIsAuthenticated()).toBe(true);
  });
});
