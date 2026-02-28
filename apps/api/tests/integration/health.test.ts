import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'

describe('GET /health', () => {
  it('returns ok via fastify.inject', async () => {
    const app = createApp()
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ ok: true })

    await app.close()
  })
})
