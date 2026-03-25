import { defineMiddleware } from 'astro:middleware';

import { getProtectionLevel, hasAccessToPath } from './application/auth/auth.guard';
import { readSessionUser } from './application/auth/auth.server';

export const onRequest = defineMiddleware(async (context, next) => {
  const protectionLevel = getProtectionLevel(context.url.pathname);

  if (!protectionLevel) {
    return next();
  }

  try {
    const user = await readSessionUser(context.request);
    context.locals.authUser = user;

    if (!user) {
      return context.redirect('/login', 302);
    }

    if (!hasAccessToPath(user, context.url.pathname)) {
      return context.redirect('/forbidden', 302);
    }

    return next();
  } catch {
    return new Response('Authentication service unavailable', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });
  }
});
