import fastify from 'fastify';

import { cachePlugin } from '@/infrastructure/app/cache/app-cache.service';
import { drizzlePlugin } from '@/infrastructure/app/db/app-database.service';
import {
  type AppBootstrapOptions,
  configPlugin,
} from '@/infrastructure/app/http/app-config.service';
import { securityPlugin } from '@/infrastructure/app/http/app-security.service';
import { registerHealthRoutes } from '@/presentation/health/routes/health.controller';
import { registerPresenceRoutes } from '@/presentation/presence/routes/presence.controller';
import { getLoggerOptions } from '@/shared/runtime/service/app-logger.service';

export function createApp(options: AppBootstrapOptions = {}) {
  const app = fastify({
    logger:
      options.envOverrides?.NODE_ENV === 'test' || process.env.NODE_ENV === 'test'
        ? false
        : getLoggerOptions(),
  });

  app.register(configPlugin, options);
  app.register(securityPlugin);
  app.register(drizzlePlugin);
  app.register(cachePlugin);

  app.after(() => {
    registerHealthRoutes(app);
    registerPresenceRoutes(app);
  });

  return app;
}
