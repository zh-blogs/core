import { Sites, TagDefinitions } from '@zhblogs/db';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTestApp } from '@tests/create-test-app';
import {
  mockReadSelect,
  mockWriteInsertFailure,
  mockWriteInsertSuccess,
} from '@tests/fixtures/db-mocks';

describe('site submission routes', () => {
  let app: ReturnType<typeof createTestApp> | undefined;
  const mainTagId = '11111111-1111-4111-8111-111111111111';
  const frameworkId = '44444444-4444-4444-8444-444444444444';

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  it('submits a new site as a pending create audit', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockReadSelect(app, [
      {
        table: TagDefinitions,
        rows: [{ id: mainTagId }],
      },
      {
        table: Sites,
        rows: [],
      },
    ]);

    const writeMock = mockWriteInsertSuccess(app, [
      {
        id: 'audit-create-id',
        status: 'PENDING',
      },
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sites',
      payload: {
        submitter_name: 'Alice',
        submitter_email: 'alice@example.com',
        submit_reason: 'Request inclusion for my site.',
        notify_by_email: true,
        site: {
          name: 'Example Blog',
          url: 'https://example.com',
          sign: 'A blog about software',
          main_tag_id: mainTagId,
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        audit_id: 'audit-create-id',
        action: 'CREATE',
        status: 'PENDING',
        site_id: null,
      },
    });

    expect(writeMock.getInsertedValues()).toMatchObject({
      action: 'CREATE',
      submitter_name: 'Alice',
      submitter_email: 'alice@example.com',
      submit_reason: 'Request inclusion for my site.',
      notify_by_email: true,
      proposed_snapshot: {
        name: 'Example Blog',
        url: 'https://example.com',
        sign: 'A blog about software',
        from: ['WEB_SUBMIT'],
        classification_status: 'COMPLETE',
        main_tag_id: mainTagId,
        tag_ids: [mainTagId],
      },
    });

    expect(writeMock.getInsertedValues()).toMatchObject({
      diff: expect.arrayContaining([
        expect.objectContaining({ field: 'name', after: 'Example Blog' }),
        expect.objectContaining({ field: 'url', after: 'https://example.com' }),
        expect.objectContaining({ field: 'main_tag_id', after: mainTagId }),
      ]),
    });
  });

  it('keeps architecture repo and stacks in create snapshot', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockReadSelect(app, [
      {
        table: TagDefinitions,
        rows: [{ id: mainTagId }],
      },
      {
        table: Sites,
        rows: [],
      },
    ]);

    const writeMock = mockWriteInsertSuccess(app, [
      {
        id: 'audit-create-arch-id',
        status: 'PENDING',
      },
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sites',
      payload: {
        submitter_name: 'Alice',
        submitter_email: 'alice@example.com',
        submit_reason: 'Request inclusion for my site.',
        notify_by_email: true,
        site: {
          name: 'Example Blog',
          url: 'https://example.com',
          sign: 'A blog about software',
          main_tag_id: mainTagId,
          architecture: {
            program_name: 'Ghost',
            website_url: null,
            repo_url: 'https://github.com/ghost/ghost',
            stacks: [
              {
                category: 'FRAMEWORK',
                catalog_id: frameworkId,
                name: null,
                name_normalized: null,
              },
            ],
          },
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(writeMock.getInsertedValues()).toMatchObject({
      proposed_snapshot: {
        architecture: {
          program_name: 'Ghost',
          website_url: null,
          repo_url: 'https://github.com/ghost/ghost',
          stacks: [
            {
              category: 'FRAMEWORK',
              catalog_id: frameworkId,
              name: null,
              name_normalized: null,
            },
          ],
        },
      },
    });
  });

  it('rejects malformed create submissions before touching the database', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/sites',
      payload: {
        submitter_name: 'Alice',
        submitter_email: 'not-an-email',
        submit_reason: 'Request inclusion for my site.',
        notify_by_email: false,
        site: {
          name: 'Example Blog',
          url: 'https://example.com',
          sign: 'A blog about software',
          main_tag_id: mainTagId,
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'INVALID_BODY',
        message: 'Request body contains empty or malformed fields.',
        fields: ['submitter_email'],
      },
    });
  });

  it('returns 503 when create audit persistence fails', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockReadSelect(app, [
      {
        table: TagDefinitions,
        rows: [{ id: mainTagId }],
      },
      {
        table: Sites,
        rows: [],
      },
    ]);

    mockWriteInsertFailure(app, new Error('write failed'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/sites',
      payload: {
        submitter_name: 'Alice',
        submitter_email: 'alice@example.com',
        submit_reason: 'Request inclusion for my site.',
        notify_by_email: false,
        site: {
          name: 'Example Blog',
          url: 'https://example.com',
          sign: 'A blog about software',
          main_tag_id: mainTagId,
        },
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'DEPENDENCY_ERROR',
        message: 'Unable to persist the site creation submission right now.',
      },
    });
  });
});
