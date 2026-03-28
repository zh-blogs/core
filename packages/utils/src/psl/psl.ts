/**
 * Public Suffix List (PSL) parser.
 * From https://github.com/lupomontero/psl
 * Author: lupomontero
 */

import punycode from './punycode';
import rules from './rules';

export type ParsedDomain = {
  input: string;
  tld: string | null;
  sld: string | null;
  domain: string | null;
  subdomain: string | null;
  listed: boolean;
};

export enum errorCodes {
  DOMAIN_TOO_SHORT = 'Domain name too short',
  DOMAIN_TOO_LONG = 'Domain name too long. It should be no more than 255 chars.',
  LABEL_STARTS_WITH_DASH = 'Domain name label can not start with a dash.',
  LABEL_ENDS_WITH_DASH = 'Domain name label can not end with a dash.',
  LABEL_TOO_LONG = 'Domain name label should be at most 63 chars long.',
  LABEL_TOO_SHORT = 'Domain name label should be at least 1 character long.',
  LABEL_INVALID_CHARS = 'Domain name label can only contain alphanumeric characters or dashes.',
}

export type ErrorResult<T extends keyof typeof errorCodes> = {
  input: string;
  error: {
    code: T;
    message: (typeof errorCodes)[T];
  };
};

/**
 * Parse rules from file.
 */
const rulesByPunySuffix = rules.reduce((map, rule) => {
  const suffix = rule.replace(/^(\*\.|!)/, '');
  const punySuffix = punycode.toASCII(suffix);
  const firstChar = rule.charAt(0);

  if (map.has(punySuffix)) {
    throw new Error(`Multiple rules found for ${rule} (${punySuffix})`);
  }

  map.set(punySuffix, {
    rule,
    suffix,
    punySuffix,
    wildcard: firstChar === '*',
    exception: firstChar === '!',
  });

  return map;
}, new Map());

/**
 *
 * @param domain
 * @returns
 * Find rule for a given domain.
 */
const findRule = (domain: string) => {
  const punyDomain = punycode.toASCII(domain);
  const punyDomainChunks = punyDomain.split('.');

  for (let i = 0; i < punyDomainChunks.length; i++) {
    const suffix = punyDomainChunks.slice(i).join('.');
    const matchingRules = rulesByPunySuffix.get(suffix);
    if (matchingRules) {
      return matchingRules;
    }
  }

  return null;
};

/**
 *
 * @param input
 * @returns
 * Validate domain name and throw if not valid.
 *
 * From wikipedia:
 *
 * Hostnames are composed of series of labels concatenated with dots, as are all
 * domain names. Each label must be between 1 and 63 characters long, and the
 * entire hostname (including the delimiting dots) has a maximum of 255 chars.
 *
 * Allowed chars:
 *
 * * `a-z`
 * * `0-9`
 * * `-` but not as a starting or ending character
 * * `.` as a separator for the textual portions of a domain name
 *
 * * http://en.wikipedia.org/wiki/Domain_name
 * * http://en.wikipedia.org/wiki/Hostname
 */
const validate = (input: string) => {
  // Before we can validate we need to take care of IDNs with unicode chars.
  const ascii = punycode.toASCII(input);

  if (ascii.length < 1) {
    return 'DOMAIN_TOO_SHORT';
  }
  if (ascii.length > 255) {
    return 'DOMAIN_TOO_LONG';
  }

  // Check each part's length and allowed chars.
  const labels = ascii.split('.');
  let label: string;

  for (let i = 0; i < labels.length; ++i) {
    label = labels[i] ?? '';
    if (!label.length) {
      return 'LABEL_TOO_SHORT';
    }
    if (label.length > 63) {
      return 'LABEL_TOO_LONG';
    }
    if (label.charAt(0) === '-') {
      return 'LABEL_STARTS_WITH_DASH';
    }
    if (label.charAt(label.length - 1) === '-') {
      return 'LABEL_ENDS_WITH_DASH';
    }
    if (!/^[a-z0-9\-_]+$/.test(label)) {
      return 'LABEL_INVALID_CHARS';
    }
  }
};

/**
 *
 * @param input
 * @returns
 * Parse domain.
 */
export const parse = (input: string): ParsedDomain | ErrorResult<keyof typeof errorCodes> => {
  if (typeof input !== 'string') {
    throw new TypeError('Domain name must be a string.');
  }

  // Force domain to lowercase.
  let domain = input.slice(0).toLowerCase();

  // Handle FQDN.
  // TODO: Simply remove trailing dot?
  if (domain.charAt(domain.length - 1) === '.') {
    domain = domain.slice(0, domain.length - 1);
  }

  // Validate and sanitise input.
  const error = validate(domain);
  if (error) {
    return {
      input: input,
      error: {
        message: errorCodes[error],
        code: error,
      },
    };
  }

  const parsed: ParsedDomain = {
    input: input,
    tld: null,
    sld: null,
    domain: null,
    subdomain: null,
    listed: false,
  };

  const domainParts = domain.split('.');

  // Non-Internet TLD
  if (domainParts[domainParts.length - 1] === 'local') {
    return parsed;
  }

  const handlePunycode = () => {
    if (!/xn--/.test(domain)) {
      return parsed;
    }
    if (parsed.domain) {
      parsed.domain = punycode.toASCII(parsed.domain);
    }
    if (parsed.subdomain) {
      parsed.subdomain = punycode.toASCII(parsed.subdomain);
    }
    return parsed;
  };

  const rule = findRule(domain);

  // Unlisted tld.
  if (!rule) {
    if (domainParts.length < 2) {
      return parsed;
    }
    parsed.tld = domainParts.pop() || null;
    parsed.sld = domainParts.pop() || null;
    parsed.domain = [parsed.sld, parsed.tld].join('.');
    if (domainParts.length) {
      parsed.subdomain = domainParts.pop() || null;
    }

    return handlePunycode();
  }

  // At this point we know the public suffix is listed.
  parsed.listed = true;

  const tldParts = rule.suffix.split('.');
  const privateParts = domainParts.slice(0, domainParts.length - tldParts.length);

  if (rule.exception) {
    privateParts.push(tldParts.shift());
  }

  parsed.tld = tldParts.join('.');

  if (!privateParts.length) {
    return handlePunycode();
  }

  if (rule.wildcard) {
    tldParts.unshift(privateParts.pop());
    parsed.tld = tldParts.join('.');
  }

  if (!privateParts.length) {
    return handlePunycode();
  }

  parsed.sld = privateParts.pop() || null;
  parsed.domain = [parsed.sld, parsed.tld].join('.');

  if (privateParts.length) {
    parsed.subdomain = privateParts.join('.');
  }

  return handlePunycode();
};

/**
 *
 * @param domain
 * @returns
 * Get domain.
 */
export const get = (domain: string): string | null => {
  if (!domain) {
    return null;
  }
  const result = parse(domain);
  if ('domain' in result) {
    return result.domain || null;
  }
  return null;
};

/**
 *
 * @param domain
 * @returns
 * Check whether domain belongs to a known public suffix.
 */
export const isValid = (domain: string): boolean => {
  const parsed = parse(domain);
  if ('domain' in parsed && 'listed' in parsed) {
    return Boolean(parsed.domain && parsed.listed);
  }
  return false;
};

/**
 *
 * @param url
 * @returns
 * Check whether URL is valid and its hostname belongs to a known public suffix.
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const newUrl = new URL(url);
    return isValid(newUrl.hostname);
  } catch {
    return false;
  }
};
