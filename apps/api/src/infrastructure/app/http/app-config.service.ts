import fastifyEnv from '@fastify/env';
import fp from 'fastify-plugin';

export interface AppConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  DATABASE_URL: string;
  VALKEY_URL: string;
  API_PORT?: number;
  API_LOG_LEVEL?: string;
  API_LOG_DIR?: string;
  API_WEB_BASE_URL: string;
  API_CORS_ORIGINS: string;
  API_GITHUB_CLIENT_ID?: string;
  API_GITHUB_CLIENT_SECRET?: string;
  API_GITHUB_CALLBACK_URL: string;
  API_GITHUB_SCOPE: string;
  API_COOKIE_DOMAIN?: string;
  API_JWT_ACCESS_SECRET: string;
  API_JWT_REFRESH_SECRET: string;
  API_JWT_ACCESS_TTL_SECONDS: number;
  API_JWT_REFRESH_TTL_SECONDS: number;
  API_SMTP_HOST?: string;
  API_SMTP_PORT: number;
  API_SMTP_SECURE: boolean;
  API_SMTP_USER?: string;
  API_SMTP_PASS?: string;
  API_SMTP_FROM?: string;
  API_INTERNAL_TOKEN: string;
}

export interface AppBootstrapOptions {
  envOverrides?: Partial<AppConfig>;
  disableExternalServices?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    bootstrapOptions: AppBootstrapOptions;
  }
}

const envSchema = {
  type: 'object',
  required: ['NODE_ENV', 'DATABASE_URL', 'VALKEY_URL'],
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
    API_WEB_BASE_URL: {
      type: 'string',
      default: 'http://127.0.0.1:9902',
    },
    API_CORS_ORIGINS: {
      type: 'string',
      default:
        'http://127.0.0.1:4321,http://localhost:4321,http://127.0.0.1:9902,http://localhost:9902',
    },
    API_GITHUB_CLIENT_ID: {
      type: 'string',
    },
    API_GITHUB_CLIENT_SECRET: {
      type: 'string',
    },
    API_GITHUB_CALLBACK_URL: {
      type: 'string',
      default: 'http://127.0.0.1:9901/auth/github/callback',
    },
    API_GITHUB_SCOPE: {
      type: 'string',
      default: 'read:user,user:email',
    },
    API_COOKIE_DOMAIN: {
      type: 'string',
    },
    API_JWT_ACCESS_SECRET: {
      type: 'string',
      default: 'zhblogs-api-access-secret-for-dev-and-test-only',
      minLength: 16,
    },
    API_JWT_REFRESH_SECRET: {
      type: 'string',
      default: 'zhblogs-api-refresh-secret-for-dev-and-test-only',
      minLength: 16,
    },
    API_JWT_ACCESS_TTL_SECONDS: {
      type: 'number',
      default: 900,
    },
    API_JWT_REFRESH_TTL_SECONDS: {
      type: 'number',
      default: 604800,
    },
    API_SMTP_HOST: {
      type: 'string',
    },
    API_SMTP_PORT: {
      type: 'number',
      default: 587,
    },
    API_SMTP_SECURE: {
      type: 'boolean',
      default: false,
    },
    API_SMTP_USER: {
      type: 'string',
    },
    API_SMTP_PASS: {
      type: 'string',
    },
    API_SMTP_FROM: {
      type: 'string',
    },
    API_INTERNAL_TOKEN: {
      type: 'string',
      default: 'zhblogs-internal-dev-token',
      minLength: 16,
    },
  },
} as const;

export const configPlugin = fp<AppBootstrapOptions>(
  async (app, options) => {
    app.decorate('bootstrapOptions', options);

    const envData = {
      ...process.env,
      ...options.envOverrides,
    };

    await app.register(fastifyEnv, {
      confKey: 'config',
      schema: envSchema,
      data: envData,
      dotenv: false,
    });
  },
  { name: 'config' },
);
