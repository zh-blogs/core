import type { FastifyInstance } from 'fastify';

import { registerPublicAnnouncementRoutes } from './public-announcement.routes';
import { registerPublicSiteAccessRoutes } from './public-site-access.routes';
import { registerPublicSiteDetailRoutes } from './public-site-detail.routes';
import { registerPublicSiteDirectoryRoutes } from './public-site-directory.routes';

export function registerPublicRoutes(app: FastifyInstance): void {
  registerPublicAnnouncementRoutes(app);
  registerPublicSiteDirectoryRoutes(app);
  registerPublicSiteAccessRoutes(app);
  registerPublicSiteDetailRoutes(app);
}
