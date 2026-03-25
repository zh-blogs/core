export const PRESENCE_CLIENT_STORAGE_KEY = 'zhblogs-presence-id';
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 15_000;
export const PRESENCE_POLL_INTERVAL_MS = 30_000;

type FetchLike = typeof fetch;
type TimerHandle = ReturnType<typeof globalThis.setInterval>;

export interface PresenceCountNode {
  textContent: string | null;
  dataset: {
    apiBaseUrl?: string;
  };
}

export interface PresenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PresenceEvent {
  data?: string;
}

export interface PresenceEventSourceLike {
  addEventListener(type: string, listener: (event: PresenceEvent) => void): void;
  close(): void;
}

export interface PresenceControllerOptions {
  apiBaseUrl: string;
  countNode: PresenceCountNode;
  storage: PresenceStorage;
  fetchImpl: FetchLike;
  createEventSource?: (url: string) => PresenceEventSourceLike;
  randomUUID?: () => string;
  setIntervalFn?: (callback: () => void, intervalMs: number) => TimerHandle;
  clearIntervalFn?: (handle: TimerHandle) => void;
}

type PresenceApiResponse =
  | {
      count?: number;
    }
  | {
      data?: {
        count?: number;
      };
    };

const jsonHeaders = {
  accept: 'application/json',
};

export const normalizeApiBaseUrl = (value: string): string => value.replace(/\/+$/, '');

export const getOrCreatePresenceClientId = (
  storage: PresenceStorage,
  randomUUID: () => string,
): string => {
  const existingClientId = storage.getItem(PRESENCE_CLIENT_STORAGE_KEY);

  if (existingClientId) {
    return existingClientId;
  }

  const nextClientId = randomUUID();
  storage.setItem(PRESENCE_CLIENT_STORAGE_KEY, nextClientId);

  return nextClientId;
};

export const readPresenceCount = (payload: PresenceApiResponse): number | null => {
  const directCount =
    'count' in payload && typeof payload.count === 'number' ? payload.count : null;

  if (directCount !== null) {
    return directCount;
  }

  if ('data' in payload && payload.data && typeof payload.data.count === 'number') {
    return payload.data.count;
  }

  return null;
};

export const createBuildFooterPresenceController = (options: PresenceControllerOptions) => {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
  const randomUUID = options.randomUUID ?? (() => crypto.randomUUID());
  const setIntervalFn: (callback: () => void, intervalMs: number) => TimerHandle =
    options.setIntervalFn ??
    ((callback, intervalMs) => globalThis.setInterval(callback, intervalMs));
  const clearIntervalFn: (handle: TimerHandle) => void =
    options.clearIntervalFn ??
    ((handle) => {
      globalThis.clearInterval(handle);
    });

  let heartbeatTimer: TimerHandle | null = null;
  let pollTimer: TimerHandle | null = null;
  let stream: PresenceEventSourceLike | null = null;

  const setCount = (count: number | null) => {
    if (count === null) {
      return;
    }

    options.countNode.textContent = String(count);
  };

  const readSnapshot = async () => {
    try {
      const response = await options.fetchImpl(`${apiBaseUrl}/api/presence/online`, {
        cache: 'no-store',
        headers: jsonHeaders,
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as PresenceApiResponse;
      setCount(readPresenceCount(payload));
    } catch {
      // Leave the current footer value in place when the snapshot read fails.
    }
  };

  const start = () => {
    const clientId = getOrCreatePresenceClientId(options.storage, randomUUID);

    const sendHeartbeat = async () => {
      try {
        const response = await options.fetchImpl(`${apiBaseUrl}/api/presence/heartbeat`, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            ...jsonHeaders,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            clientId,
          }),
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PresenceApiResponse;
        setCount(readPresenceCount(payload));
      } catch {
        // Heartbeat failures should not crash the footer; the next poll or reconnect can recover.
      }
    };

    void readSnapshot();
    void sendHeartbeat();

    if (options.createEventSource) {
      stream = options.createEventSource(`${apiBaseUrl}/api/presence/stream`);
      stream.addEventListener('presence.online', (event) => {
        if (!event.data) {
          return;
        }

        try {
          const payload = JSON.parse(event.data) as PresenceApiResponse;
          setCount(readPresenceCount(payload));
        } catch {
          // Ignore malformed stream events and wait for the next update or poll.
        }
      });
    }

    heartbeatTimer = setIntervalFn(() => {
      void sendHeartbeat();
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);

    pollTimer = setIntervalFn(() => {
      void readSnapshot();
    }, PRESENCE_POLL_INTERVAL_MS);
  };

  const stop = () => {
    if (heartbeatTimer !== null) {
      clearIntervalFn(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (pollTimer !== null) {
      clearIntervalFn(pollTimer);
      pollTimer = null;
    }

    stream?.close();
    stream = null;
  };

  return {
    start,
    stop,
  };
};

export const initBuildFooterPresence = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  const countNode = document.querySelector('[data-online-count]');

  if (!countNode || !(countNode instanceof HTMLElement) || !countNode.dataset.apiBaseUrl) {
    return null;
  }

  const controller = createBuildFooterPresenceController({
    apiBaseUrl: countNode.dataset.apiBaseUrl,
    countNode,
    storage: window.localStorage,
    fetchImpl: window.fetch.bind(window),
    createEventSource:
      typeof window.EventSource === 'function' ? (url) => new window.EventSource(url) : undefined,
  });

  controller.start();

  window.addEventListener(
    'beforeunload',
    () => {
      controller.stop();
    },
    { once: true },
  );

  return controller;
};
