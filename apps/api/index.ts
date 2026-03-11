import { app } from './src/app'

const start = async () => {
  try {
    await app.ready()

    const port = app.config.API_PORT ?? 9001

    app.log.info({ port, env: app.config.NODE_ENV }, 'api server starting')

    await app.listen({ host: '0.0.0.0', port })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

void start()
