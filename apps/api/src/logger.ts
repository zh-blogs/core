import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import pino from 'pino'

const DEFAULT_LOG_DIR = join(process.cwd(), 'logs')

const resolveLogLevel = (): string => {
  if (process.env.API_LOG_LEVEL) {
    return process.env.API_LOG_LEVEL
  }

  const env = process.env.NODE_ENV ?? 'development'
  if (env === 'production') {
    return 'info'
  }

  return 'debug'
}

const getLogFilePath = (env: string): string => {
  const logDir = process.env.API_LOG_DIR ?? DEFAULT_LOG_DIR
  mkdirSync(logDir, { recursive: true })
  return join(logDir, `api-${env}.log`)
}

export function getLoggerOptions(): pino.LoggerOptions {
  const env = process.env.NODE_ENV ?? 'development'
  const level = resolveLogLevel()
  const logFilePath = getLogFilePath(env)

  if (env === 'production') {
    return {
      level,
      transport: {
        targets: [
          {
            target: 'pino/file',
            options: { destination: 1 },
          },
          {
            target: 'pino/file',
            options: {
              destination: logFilePath,
              mkdir: true,
              append: true,
            },
          },
        ],
      },
    }
  }

  return {
    level,
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:standard',
            singleLine: true,
            ignore: 'pid,hostname',
          },
        },
        {
          target: 'pino/file',
          options: {
            destination: logFilePath,
            mkdir: true,
            append: true,
          },
        },
      ],
    },
  }
}
