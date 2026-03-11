import { dbRead, dbWrite } from '@zhblogs/db'
import fp from 'fastify-plugin'
import type { AppDb, DbRead, DbWrite } from './dependencies'

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDb
  }
}

export const drizzlePlugin = fp(
  async (app) => {
    app.decorate('db', {
      read: dbRead,
      write: dbWrite,
    } satisfies AppDb)
  },
  { name: 'drizzle', dependencies: ['config'] },
)
