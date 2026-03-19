import type { CacheClient } from '../plugins/dependencies'

export const PRESENCE_KEY = 'presence:online:v1'
export const PRESENCE_ACTIVE_WINDOW_MS = 45 * 1000
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 15 * 1000
export const PRESENCE_STREAM_HEARTBEAT_MS = 15 * 1000
export const PRESENCE_EVENT_NAME = 'presence.online'

export interface PresenceSnapshot {
  count: number
  at: string
}

export type PresenceSubscriber = (snapshot: PresenceSnapshot) => void

const DEFAULT_CACHE_ERROR =
  'presence cache commands are unavailable because app.db.cache.customCommand is not configured'

const parsePresenceCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const getCacheCommand = (cache?: CacheClient) => {
  if (!cache?.customCommand) {
    throw new Error(DEFAULT_CACHE_ERROR)
  }

  return cache.customCommand.bind(cache)
}

export const readPresenceCount = async (
  cache: CacheClient | undefined,
  now = Date.now(),
  activeWindowMs = PRESENCE_ACTIVE_WINDOW_MS,
): Promise<number> => {
  const customCommand = getCacheCommand(cache)
  const activeSince = now - activeWindowMs

  await customCommand([
    'ZREMRANGEBYSCORE',
    PRESENCE_KEY,
    '-inf',
    String(activeSince - 1),
  ])

  const result = await customCommand([
    'ZCOUNT',
    PRESENCE_KEY,
    String(activeSince),
    '+inf',
  ])

  return parsePresenceCount(result)
}

export const touchPresence = async (
  cache: CacheClient | undefined,
  clientId: string,
  now = Date.now(),
  activeWindowMs = PRESENCE_ACTIVE_WINDOW_MS,
): Promise<number> => {
  const customCommand = getCacheCommand(cache)
  const activeSince = now - activeWindowMs

  await customCommand([
    'ZREMRANGEBYSCORE',
    PRESENCE_KEY,
    '-inf',
    String(activeSince - 1),
  ])
  await customCommand(['ZADD', PRESENCE_KEY, String(now), clientId])

  const result = await customCommand([
    'ZCOUNT',
    PRESENCE_KEY,
    String(activeSince),
    '+inf',
  ])

  return parsePresenceCount(result)
}

export const createPresenceSnapshot = (
  count: number,
  now = new Date(),
): PresenceSnapshot => ({
  count,
  at: now.toISOString(),
})

export const formatPresenceEvent = (snapshot: PresenceSnapshot): string =>
  `event: ${PRESENCE_EVENT_NAME}\ndata: ${JSON.stringify(snapshot)}\n\n`

export const formatPresenceComment = (comment = 'keepalive'): string =>
  `: ${comment}\n\n`

export const createPresenceEventHub = () => {
  const subscribers = new Set<PresenceSubscriber>()

  return {
    subscribe(subscriber: PresenceSubscriber) {
      subscribers.add(subscriber)

      return () => {
        subscribers.delete(subscriber)
      }
    },
    publish(snapshot: PresenceSnapshot) {
      for (const subscriber of subscribers) {
        try {
          subscriber(snapshot)
        } catch {
          // Ignore subscriber write failures; the request cleanup path removes dead clients.
        }
      }
    },
    size() {
      return subscribers.size
    },
  }
}
