import fastifyEnv from '@fastify/env'
import fp from 'fastify-plugin'

export interface AppConfig {
  NODE_ENV: 'development' | 'test' | 'production'
  DATABASE_URL: string
  VALKEY_URL: string
  API_PORT?: number
  API_LOG_LEVEL?: string
  API_LOG_DIR?: string
}

export interface AppBootstrapOptions {
  envOverrides?: Partial<AppConfig>
  disableExternalServices?: boolean
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig
    bootstrapOptions: AppBootstrapOptions
  }
}

const envSchema = {
  type: 'object',
  required: [
    'NODE_ENV',
    'DATABASE_URL',
    'VALKEY_URL',
  ],
  properties: {
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'test', 'production'],
    },
    API_PORT: {
      type: 'number',
      default: 9901,
    },
    DATABASE_URL: {
      type: 'string',
      minLength: 1,
    },
    VALKEY_URL: {
      type: 'string',
      minLength: 1,
    },
    API_LOG_LEVEL: {
      type: 'string',
    },
    API_LOG_DIR: {
      type: 'string',
    },
  },
} as const

export const configPlugin = fp<AppBootstrapOptions>(
  async (app, options) => {
    app.decorate('bootstrapOptions', options)

    const envData = {
      ...process.env,
      ...options.envOverrides,
    }

    await app.register(fastifyEnv, {
      confKey: 'config',
      schema: envSchema,
      data: envData,
      dotenv: false,
    })
  },
  { name: 'config' },
)
