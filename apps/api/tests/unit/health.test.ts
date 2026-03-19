import { afterEach, describe, expect, it } from 'vitest'
import { createTestApp } from '../create-test-app'

describe('app plugin registration', () => {
  let app: ReturnType<typeof createTestApp> | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('decorates fastify instance with config, db and cache clients', async () => {
    app = createTestApp({
      disableExternalServices: true,
    })

    await app.ready()

    expect(app.config).toBeDefined()
    expect(app.db).toBeDefined()
    expect(app.db.read).toBeDefined()
    expect(app.db.write).toBeDefined()
    expect(app.db.cache).toBeDefined()
  })

  it('exposes health, auth, presence and site submission routes', async () => {
    app = createTestApp({
      disableExternalServices: true,
    })

    await app.ready()

    const routes = app.printRoutes()
    const health = await app.inject({ method: 'GET', url: '/health' })
    const missingDocs = await app.inject({ method: 'GET', url: '/docs' })
    const currentUser = await app.inject({ method: 'GET', url: '/auth/me' })
    const presence = await app.inject({ method: 'GET', url: '/api/presence/online' })
    const missingStats = await app.inject({ method: 'GET', url: '/api/stats' })

    expect(routes).toContain('health (GET, HEAD)')
    expect(routes).toContain('me (GET, HEAD)')
    expect(routes).toContain('refresh (POST)')
    expect(routes).toContain('grant-admin (POST)')
    expect(routes).toContain('revoke-admin (POST)')
    expect(routes).toContain('online (GET, HEAD)')
    expect(routes).toContain('heartbeat (POST)')
    expect(routes).toContain('stream (GET, HEAD)')
    expect(routes).toContain('sites (POST)')
    expect(routes).toContain(':siteId')
    expect(routes).toContain('/updates (POST)')
    expect(health.statusCode).toBe(200)
    expect(presence.statusCode).toBe(200)
    expect(missingDocs.statusCode).toBe(404)
    expect(currentUser.statusCode).toBe(401)
    expect(missingStats.statusCode).toBe(404)
  })
})
