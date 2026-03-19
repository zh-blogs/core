import { afterEach, describe, expect, it } from 'vitest'
import {
  createPresenceEventHub,
  createPresenceSnapshot,
  formatPresenceComment,
  formatPresenceEvent,
  readPresenceCount,
  touchPresence,
} from '../../src/lib/presence'
import { createTestApp } from '../create-test-app'

describe('presence helpers', () => {
  let app: ReturnType<typeof createTestApp> | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('tracks active presence in the cache window', async () => {
    app = createTestApp({
      disableExternalServices: true,
    })

    await app.ready()

    expect(await touchPresence(app.db.cache, 'alpha', 1_000, 100)).toBe(1)
    expect(await touchPresence(app.db.cache, 'alpha', 1_050, 100)).toBe(1)
    expect(await touchPresence(app.db.cache, 'beta', 1_120, 100)).toBe(2)
    expect(await touchPresence(app.db.cache, 'gamma', 1_200, 100)).toBe(2)
    expect(await readPresenceCount(app.db.cache, 1_200, 100)).toBe(2)
  })

  it('formats and publishes sse presence events', () => {
    const hub = createPresenceEventHub()
    const received = [] as ReturnType<typeof createPresenceSnapshot>[]
    const snapshot = createPresenceSnapshot(3, new Date('2026-03-19T00:00:00.000Z'))

    const unsubscribe = hub.subscribe((event) => {
      received.push(event)
    })

    hub.publish(snapshot)

    expect(received).toEqual([snapshot])
    expect(formatPresenceEvent(snapshot)).toContain('event: presence.online')
    expect(formatPresenceEvent(snapshot)).toContain('"count":3')
    expect(formatPresenceComment()).toBe(': keepalive\n\n')

    unsubscribe()
    hub.publish(createPresenceSnapshot(4))

    expect(received).toHaveLength(1)
  })
})
