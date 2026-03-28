import type { APIRoute } from 'astro';

import {
  handleSiteDirectoryPreferenceGet,
  handleSiteDirectoryPreferencePut,
} from '@/application/site/site-directory.server-handler';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handleSiteDirectoryPreferenceGet(request);
export const PUT: APIRoute = async ({ request }) => handleSiteDirectoryPreferencePut(request);
