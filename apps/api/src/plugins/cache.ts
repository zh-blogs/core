import { GlideClient } from '@valkey/valkey-glide'
import fp from 'fastify-plugin'
import type { CacheClient } from './dependencies'

const parseValkeyUrl = (url: string): { host: string; port: number; useTLS: boolean } => {
  const parsed = new URL(url)

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    useTLS: parsed.protocol === 'rediss:',
  }
}

export const cachePlugin = fp(
  async (app) => {
    if (app.bootstrapOptions.disableExternalServices) {
      const mockClient = {
        ping: async () => 'PONG',
        close: () => undefined,
      } as unknown as CacheClient

      app.db.cache = mockClient
      return
    }

    const { host, port, useTLS } = parseValkeyUrl(app.config.VALKEY_URL)
    const client = await GlideClient.createClient({
      addresses: [{ host, port }],
      clientName: `zhblogs-api-${app.config.NODE_ENV}`,
      requestTimeout: 1_000,
      useTLS,
    })

    app.db.cache = client
    app.log.info({ host, port, useTLS }, 'cache client connected')

    app.addHook('onClose', async () => {
      client.close()
    })
  },
  { name: 'cache', dependencies: ['config', 'drizzle'] },
)
