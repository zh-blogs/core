import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  buildArchiveAnnouncementHandler,
  buildDeleteAnnouncementHandler,
  buildListAnnouncementsHandler,
  buildSaveAnnouncementHandler,
} from './management-announcement.handlers';
import { requireAnnouncementManager } from './management-announcement.helpers';
import {
  announcementEnvelopeSchema,
  announcementListEnvelopeSchema,
  deleteEnvelopeSchema,
  listQuerySchema,
  paramsSchema,
  saveAnnouncementBodySchema,
} from './management-announcement.schemas';

type ActorHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  actorId: string,
) => Promise<unknown>;

const buildActorHandler =
  (app: FastifyInstance, handler: ActorHandler) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const actor = await app.auth.getCurrentUser(request);
    return handler(request, reply, actor.id);
  };

const registerAnnouncementListRoute = (
  app: FastifyInstance,
  listHandler: ReturnType<typeof buildListAnnouncementsHandler>,
) => {
  app.get(
    '/api/management/announcements',
    {
      preHandler: requireAnnouncementManager,
      schema: {
        querystring: listQuerySchema,
        response: {
          200: announcementListEnvelopeSchema,
        },
      },
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    listHandler,
  );
};

const registerAnnouncementSaveRoute = (
  app: FastifyInstance,
  saveHandler: ReturnType<typeof buildSaveAnnouncementHandler>,
) => {
  app.post(
    '/api/management/announcements',
    {
      preHandler: requireAnnouncementManager,
      schema: {
        body: saveAnnouncementBodySchema,
        response: {
          200: announcementEnvelopeSchema,
        },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    buildActorHandler(app, saveHandler),
  );
};

const registerAnnouncementArchiveRoute = (
  app: FastifyInstance,
  archiveHandler: ReturnType<typeof buildArchiveAnnouncementHandler>,
) => {
  app.post(
    '/api/management/announcements/:id/archive',
    {
      preHandler: requireAnnouncementManager,
      schema: {
        params: paramsSchema,
        response: {
          200: announcementEnvelopeSchema,
        },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    buildActorHandler(app, archiveHandler),
  );
};

const registerAnnouncementDeleteRoute = (
  app: FastifyInstance,
  deleteHandler: ReturnType<typeof buildDeleteAnnouncementHandler>,
) => {
  app.post(
    '/api/management/announcements/:id/delete',
    {
      preHandler: requireAnnouncementManager,
      schema: {
        params: paramsSchema,
        response: {
          200: deleteEnvelopeSchema,
        },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    deleteHandler,
  );
};

export function registerManagementAnnouncementRoutes(app: FastifyInstance): void {
  const listHandler = buildListAnnouncementsHandler(app);
  const saveHandler = buildSaveAnnouncementHandler(app);
  const archiveHandler = buildArchiveAnnouncementHandler(app);
  const deleteHandler = buildDeleteAnnouncementHandler(app);

  registerAnnouncementListRoute(app, listHandler);
  registerAnnouncementSaveRoute(app, saveHandler);
  registerAnnouncementArchiveRoute(app, archiveHandler);
  registerAnnouncementDeleteRoute(app, deleteHandler);
}
