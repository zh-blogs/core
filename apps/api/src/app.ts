import fastify from 'fastify'
import { getLoggerOptions } from './logger'
import { configPlugin, type AppBootstrapOptions } from './plugins/config'
import { cachePlugin } from './plugins/cache'
import { drizzlePlugin } from './plugins/drizzle'
import { securityPlugin } from './plugins/security'
import { registerHealthRoutes } from './routes/health'

export function createApp(options: AppBootstrapOptions = {}) {
  const app = fastify({
    logger:
      options.envOverrides?.NODE_ENV === 'test' || process.env.NODE_ENV === 'test'
        ? false
        : getLoggerOptions(),
  })

  app.register(configPlugin, options)
  app.register(securityPlugin)
  app.register(drizzlePlugin)
  app.register(cachePlugin)

  app.after(() => {
    registerHealthRoutes(app)
  })

  return app
}

export const app = createApp()
