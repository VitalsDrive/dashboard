// Minimal Angular core mock for Jest unit tests (no DI container needed)

export function Injectable(opts?: any) {
  return (target: any) => target;
}

export function inject(token: any): never {
  throw new Error(`inject() not supported in unit tests — use constructor injection or direct instantiation`);
}

export function signal<T>(initialValue: T) {
  let _value = initialValue;
  const sig: any = () => _value;
  sig.set = (v: T) => { _value = v; };
  sig.update = (fn: (v: T) => T) => { _value = fn(_value); };
  return sig as { (): T; set(v: T): void; update(fn: (v: T) => T): void };
}

export function computed<T>(fn: () => T): () => T {
  return fn;
}

export function effect(_fn: () => void): void {
  // no-op in tests
}
