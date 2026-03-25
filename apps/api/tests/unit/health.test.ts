import { afterEach, describe, expect, it } from 'vitest';

import { createTestApp } from '@tests/create-test-app';

describe('app plugin registration', () => {
  let app: ReturnType<typeof createTestApp> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('decorates fastify instance with config, db and cache clients', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    expect(app.config).toBeDefined();
    expect(app.db).toBeDefined();
    expect(app.db.read).toBeDefined();
    expect(app.db.write).toBeDefined();
    expect(app.db.cache).toBeDefined();
  });

  it('exposes health and presence routes', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    const routes = app.printRoutes();
    const health = await app.inject({ method: 'GET', url: '/health' });
    const presence = await app.inject({ method: 'GET', url: '/api/presence/online' });

    expect(routes).toContain('health (GET, HEAD)');
    expect(routes).toContain('online (GET, HEAD)');
    expect(routes).toContain('heartbeat (POST)');
    expect(routes).toContain('stream (GET, HEAD)');
    expect(health.statusCode).toBe(200);
    expect(presence.statusCode).toBe(200);
  });
});
