import { createRequire } from 'node:module';

type PunycodeModule = typeof import('punycode');

const require = createRequire(import.meta.url);

const punycode = require('punycode/') as PunycodeModule;

export default punycode;
