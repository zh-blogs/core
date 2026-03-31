import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { recordPublicSiteAccessEvent } from '@/application/public/usecase/public-site.access.usecase';
import { publicSiteAccessResponseSchema } from '@/presentation/public/dto/public-response.dto';
import { errorResponseSchema } from '@/presentation/sites/dto';
import { sendApiError } from '@/presentation/sites/routes/site-route.service';

import { type PublicRouteSchema } from './public-route.helpers';

const publicSiteAccessParamSchema = z.object({
  id: z.uuid(),
});

const publicSiteAccessBodySchema = z.object({
  source: z.enum(['SITE_GO', 'SITE_DETAIL', 'SITE_CARD']),
  targetKind: z.enum(['SITE', 'FEED', 'SITEMAP', 'LINK_PAGE', 'ARTICLE']),
  path: z.string().trim().min(1).max(512),
});

type AccessRequest = FastifyRequest<{ Params: { id: string } }>;

const parseAccessInput = (request: AccessRequest, reply: FastifyReply) => {
  const parsedParams = publicSiteAccessParamSchema.safeParse(request.params);

  if (!parsedParams.success) {
    sendApiError(reply, 400, 'INVALID_SITE_ID', 'id must be a valid UUID.');
    return null;
  }

  const parsedBody = publicSiteAccessBodySchema.safeParse(request.body);

  if (!parsedBody.success) {
    sendApiError(
      reply,
      400,
      'INVALID_BODY',
      'Request body is invalid for a public site access event.',
    );
    return null;
  }

  return {
    id: parsedParams.data.id,
    ...parsedBody.data,
  };
};

const siteAccessRouteConfig = {
  schema: {
    tags: ['public'],
    summary: 'Record a public outbound site access event',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        targetKind: { type: 'string' },
        path: { type: 'string' },
      },
      required: ['source', 'targetKind', 'path'],
    },
    response: {
      200: publicSiteAccessResponseSchema,
      400: errorResponseSchema,
      404: errorResponseSchema,
    },
  } as PublicRouteSchema,
  config: {
    rateLimit: {
      max: 240,
      timeWindow: '1 minute',
    },
  },
};

const buildSiteAccessHandler =
  (app: FastifyInstance) => async (request: AccessRequest, reply: FastifyReply) => {
    const input = parseAccessInput(request, reply);
    if (!input) {
      return;
    }

    const result = await recordPublicSiteAccessEvent(app, {
      ...input,
      referer: request.headers.referer ?? null,
      origin: request.headers.origin ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

    if (!result) {
      return sendApiError(reply, 404, 'SITE_NOT_FOUND', 'The target site does not exist.');
    }

    return {
      ok: true,
      data: result,
    };
  };

export const registerPublicSiteAccessRoutes = (app: FastifyInstance) => {
  app.post<{ Params: { id: string } }>(
    '/api/public/sites/:id/access-events',
    siteAccessRouteConfig,
    buildSiteAccessHandler(app),
  );
};
