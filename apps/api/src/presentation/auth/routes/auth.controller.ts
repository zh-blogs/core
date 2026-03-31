import type { FastifyInstance } from 'fastify';

import { registerGithubAuthRoutes } from './auth-github.routes';
import { registerLocalAuthRoutes } from './auth-local.routes';
import { registerPasswordRoutes } from './auth-password.routes';
import { registerSessionRoutes } from './auth-session.routes';

export function registerAuthRoutes(app: FastifyInstance): void {
  registerGithubAuthRoutes(app);
  registerLocalAuthRoutes(app);
  registerPasswordRoutes(app);
  registerSessionRoutes(app);
}
