// Minimal mock for @angular/core/rxjs-interop (Jest unit tests)

export function takeUntilDestroyed(_destroyRef?: any) {
  return (source: any) => source;
}

export function toSignal<T>(obs: any, opts?: { initialValue?: T }): () => T {
  let _value: T = opts?.initialValue as T;
  return () => _value;
}
