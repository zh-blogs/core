import { createJsonResponse } from './mocks';

export const apiStubs = {
  auth: {
    sessionMissing: (): Response => new Response(null, { status: 401 }),
    sessionOk: (user: unknown): Response =>
      createJsonResponse(
        {
          ok: true,
          user,
        },
        200,
      ),
  },
  presence: {
    online: (count: number): Response =>
      createJsonResponse(
        {
          ok: true,
          data: {
            count,
          },
        },
        200,
      ),
    heartbeat: (count: number): Response =>
      createJsonResponse(
        {
          ok: true,
          data: {
            count,
          },
        },
        200,
      ),
  },
} as const;
