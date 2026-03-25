export class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

export class FakeEventSource {
  listeners = new Map<string, Array<(event: { data?: string }) => void>>();

  addEventListener(type: string, listener: (event: { data?: string }) => void): void {
    const existing = this.listeners.get(type) ?? [];

    existing.push(listener);
    this.listeners.set(type, existing);
  }

  emit(type: string, data?: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data });
    }
  }

  close(): void {}
}

export const createJsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
