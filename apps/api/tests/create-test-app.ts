import { createApp } from '../src/app/api/service/api.service';
import type { AppBootstrapOptions } from '../src/infrastructure/app/http/app-config.service';

import { withTestEnvOverrides } from './config';

export const createTestApp = (options: AppBootstrapOptions = {}) =>
  createApp(withTestEnvOverrides(options));
