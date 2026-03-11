import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'

describe('app plugin registration', () => {
  let app: ReturnType<typeof createApp> | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('decorates fastify instance with config, db and cache clients', async () => {
    app = createApp({
      disableExternalServices: true,
    })

    await app.ready()

    expect(app.config).toBeDefined()
    expect(app.db).toBeDefined()
    expect(app.db.read).toBeDefined()
    expect(app.db.write).toBeDefined()
    expect(app.db.cache).toBeDefined()
  })

  it('only exposes health routes', async () => {
    app = createApp({
      disableExternalServices: true,
    })

    const health = await app.inject({ method: 'GET', url: '/health' })
    const missingDocs = await app.inject({ method: 'GET', url: '/docs' })
    const missingAuth = await app.inject({ method: 'GET', url: '/auth/me' })
    const missingStats = await app.inject({ method: 'GET', url: '/api/stats' })

    expect(health.statusCode).toBe(200)
    expect(missingDocs.statusCode).toBe(404)
    expect(missingAuth.statusCode).toBe(404)
    expect(missingStats.statusCode).toBe(404)
  })
})
