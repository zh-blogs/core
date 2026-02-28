import { app } from './src/app.js'

const port = Number(process.env.PORT ?? 3000)

app.log.info({ port, env: process.env.NODE_ENV ?? 'development' }, 'api server starting')

app
  .listen({ host: '0.0.0.0', port })
  .catch((error) => {
    app.log.error(error)
    process.exit(1)
  })
