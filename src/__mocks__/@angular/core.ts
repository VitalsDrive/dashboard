// Minimal Angular core mock for Jest unit tests (no DI container needed)

export function Injectable(opts?: any) {
  return (target: any) => target;
}

export function inject(_token: any): any {
  // Returns any so TypeScript doesn't error on usages in service files.
  // In tests, inject() calls on services are bypassed by direct field assignment.
  return undefined;
}

export function signal<T>(initialValue: T) {
  let _value = initialValue;
  const sig: any = () => _value;
  sig.set = (v: T) => { _value = v; };
  sig.update = (fn: (v: T) => T) => { _value = fn(_value); };
  sig.asReadonly = () => { const ro: any = () => _value; return ro; };
  return sig as { (): T; set(v: T): void; update(fn: (v: T) => T): void; asReadonly(): () => T };
}

export function computed<T>(fn: () => T): () => T {
  return fn;
}

export function effect(_fn: () => void): void {
  // no-op in tests
}

export interface ResourceRef<T> {
  (): T | undefined;
  value: () => T | undefined;
  status: () => 'idle' | 'loading' | 'refreshing' | 'resolved' | 'error' | 'local';
  isLoading: boolean;
  error: () => unknown;
  reload: () => void;
}

export function resource<T, P>(opts: {
  params: () => P | undefined;
  loader: (ctx: { params: P }) => Promise<T>;
  defaultValue?: T;
}): ResourceRef<T> {
  let _value: T | undefined = opts.defaultValue;
  let _status: 'idle' | 'loading' | 'refreshing' | 'resolved' | 'error' | 'local' = 'idle';
  let _error: unknown = undefined;

  const ref: any = () => _value;
  ref.value = () => _value;
  ref.status = () => _status;
  ref.isLoading = false;
  ref.error = () => _error;
  ref.reload = () => {};
  ref._setStatus = (s: typeof _status) => { _status = s; };
  ref._setValue = (v: T) => { _value = v; };
  ref._setError = (e: unknown) => { _error = e; };
  return ref as ResourceRef<T>;
}

export function input() {}
(input as any).required = () => signal(undefined as any);

export function output() {
  return { emit: (_v?: any) => {} };
}

export interface OnDestroy { ngOnDestroy(): void; }
export interface OnInit { ngOnInit(): void; }
export interface AfterViewInit { ngAfterViewInit(): void; }
export const ChangeDetectionStrategy = { OnPush: 'OnPush' };
export function Component(_opts?: any) { return (target: any) => target; }
export function Input(_opts?: any) { return () => {}; }
export function Output(_opts?: any) { return () => {}; }
