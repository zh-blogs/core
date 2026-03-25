import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBuildFooterPresenceController,
  getOrCreatePresenceClientId,
  normalizeApiBaseUrl,
  PRESENCE_CLIENT_STORAGE_KEY,
} from '@/application/presence/presence.browser';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

class FakeEventSource {
  listeners = new Map<string, Array<(event: { data?: string }) => void>>();
  close = vi.fn();

  addEventListener(type: string, listener: (event: { data?: string }) => void) {
    const existing = this.listeners.get(type) ?? [];

    existing.push(listener);
    this.listeners.set(type, existing);
  }

  emit(type: string, data?: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data });
    }
  }
}

describe('browser presence helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('normalizes api base urls by trimming trailing slashes', () => {
    expect(normalizeApiBaseUrl('https://api.example.com///')).toBe('https://api.example.com');
  });

  it('persists a generated browser presence id', () => {
    const storage = new MemoryStorage();
    const randomUUID = vi.fn(() => 'generated-client-id');

    const firstClientId = getOrCreatePresenceClientId(storage, randomUUID);
    const secondClientId = getOrCreatePresenceClientId(storage, randomUUID);

    expect(firstClientId).toBe('generated-client-id');
    expect(secondClientId).toBe('generated-client-id');
    expect(storage.getItem(PRESENCE_CLIENT_STORAGE_KEY)).toBe('generated-client-id');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('requests the new api domain and updates the footer from SSE events', async () => {
    const storage = new MemoryStorage();
    const countNode = {
      textContent: '--',
      dataset: {},
    };
    const stream = new FakeEventSource();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              count: 4,
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              count: 5,
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );

    const controller = createBuildFooterPresenceController({
      apiBaseUrl: 'https://api.example.com/',
      countNode,
      storage,
      fetchImpl,
      createEventSource: () => stream,
      randomUUID: () => 'presence-client-id',
    });

    controller.start();
    await vi.waitFor(() => {
      expect(countNode.textContent).toBe('5');
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/api/presence/online',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/api/presence/heartbeat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          clientId: 'presence-client-id',
        }),
      }),
    );
    expect(countNode.textContent).toBe('5');

    stream.emit(
      'presence.online',
      JSON.stringify({
        count: 8,
      }),
    );

    expect(countNode.textContent).toBe('8');

    controller.stop();
    expect(stream.close).toHaveBeenCalledTimes(1);
  });

  it('keeps polling the online snapshot when there is no EventSource support', async () => {
    const storage = new MemoryStorage();
    const countNode = {
      textContent: '--',
      dataset: {},
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            count: 3,
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    const controller = createBuildFooterPresenceController({
      apiBaseUrl: 'https://api.example.com',
      countNode,
      storage,
      fetchImpl,
      randomUUID: () => 'presence-client-id',
    });

    controller.start();
    await vi.waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.waitFor(() => {
      expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    const requestedUrls = fetchImpl.mock.calls.map(([url]) => url);

    expect(requestedUrls).toContain('https://api.example.com/api/presence/online');
    expect(requestedUrls).toContain('https://api.example.com/api/presence/heartbeat');
    expect(
      requestedUrls.filter((url) => url === 'https://api.example.com/api/presence/online').length,
    ).toBeGreaterThanOrEqual(2);

    controller.stop();
  });
});
