import compress from '@fastify/compress'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import sensible from '@fastify/sensible'
import fp from 'fastify-plugin'

export const securityPlugin = fp(
  async (app) => {
    await app.register(sensible)

    await app.register(cors, {
      origin: true,
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    })

    await app.register(helmet, {
      crossOriginResourcePolicy: false,
    })

    await app.register(compress, {
      global: true,
      encodings: ['br', 'gzip', 'deflate'],
    })
  },
  { name: 'security', dependencies: ['config'] },
)
