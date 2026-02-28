import fastify from 'fastify'
import { getLoggerOptions } from './logger.js'

export function createApp() {
  const app = fastify({ logger: getLoggerOptions() })

  app.get('/health', async () => ({ ok: true }))

  return app
}

export const app = createApp()
