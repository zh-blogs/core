import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

const healthResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    service: { type: 'string' },
    environment: { type: 'string' },
    plugins: {
      type: 'object',
      properties: {
        config: { type: 'boolean' },
        drizzle: { type: 'boolean' },
        cache: { type: 'boolean' },
        security: { type: 'boolean' },
      },
      required: ['config', 'drizzle', 'cache', 'security'],
    },
  },
  required: ['ok', 'service', 'environment', 'plugins'],
} as const

const dependencyHealthSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    service: { type: 'string' },
    check: { type: 'string' },
  },
  required: ['ok', 'service', 'check'],
} as const

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Application health summary',
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({
      ok: true,
      service: '@zhblogs/api',
      environment: app.config.NODE_ENV,
      plugins: {
        config: Boolean(app.config),
        drizzle: Boolean(app.db.read && app.db.write),
        cache: Boolean(app.db.cache),
        security: true,
      },
    }),
  )

  app.get(
    '/health/db',
    {
      schema: {
        tags: ['health'],
        summary: 'Database dependency health',
        response: {
          200: dependencyHealthSchema,
          503: dependencyHealthSchema,
        },
      },
    },
    async (_request, reply) => {
      if (app.bootstrapOptions.disableExternalServices) {
        return {
          ok: true,
          service: 'database',
          check: 'skipped',
        }
      }

      try {
        await app.db.read.execute(sql`select 1`)
        return {
          ok: true,
          service: 'database',
          check: 'ready',
        }
      } catch (error) {
        app.log.error({ error }, 'database health check failed')
        return reply.code(503).send({
          ok: false,
          service: 'database',
          check: 'failed',
        })
      }
    },
  )

  app.get(
    '/health/cache',
    {
      schema: {
        tags: ['health'],
        summary: 'Cache dependency health',
        response: {
          200: dependencyHealthSchema,
          503: dependencyHealthSchema,
        },
      },
    },
    async (_request, reply) => {
      if (app.bootstrapOptions.disableExternalServices) {
        return {
          ok: true,
          service: 'cache',
          check: 'skipped',
        }
      }

      try {
        await app.db.cache?.ping()
        return {
          ok: true,
          service: 'cache',
          check: 'ready',
        }
      } catch (error) {
        app.log.error({ error }, 'cache health check failed')
        return reply.code(503).send({
          ok: false,
          service: 'cache',
          check: 'failed',
        })
      }
    },
  )
}
