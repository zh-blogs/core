import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

const PASSWORD_HASH_PREFIX = 'node.argon2id';
const ARGON2_MEMORY = 64 * 1024;
const ARGON2_PASSES = 3;
const ARGON2_PARALLELISM = 4;
const ARGON2_TAG_LENGTH = 32;
const ARGON2_SALT_LENGTH = 16;

type PasswordHashParams = {
  memory: number;
  passes: number;
  parallelism: number;
  tagLength: number;
  salt: Buffer;
  digest: Buffer;
};

const encodeBase64Url = (value: Buffer): string => value.toString('base64url');

const deriveKey = async (
  password: string,
  salt: Buffer,
  params: Omit<PasswordHashParams, 'salt' | 'digest'>,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    argon2(
      'argon2id',
      {
        message: password,
        nonce: salt,
        parallelism: params.parallelism,
        tagLength: params.tagLength,
        memory: params.memory,
        passes: params.passes,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(Buffer.from(derivedKey));
      },
    );
  });

const serializePasswordHash = (params: PasswordHashParams): string =>
  [
    PASSWORD_HASH_PREFIX,
    `m=${params.memory},t=${params.passes},p=${params.parallelism},l=${params.tagLength}`,
    encodeBase64Url(params.salt),
    encodeBase64Url(params.digest),
  ].join('$');

const parsePasswordHash = (passwordHash: string): PasswordHashParams | null => {
  const [prefix, optionsPart, saltPart, digestPart] = passwordHash.split('$');

  if (!prefix || !optionsPart || !saltPart || !digestPart || prefix !== PASSWORD_HASH_PREFIX) {
    return null;
  }

  const options = Object.fromEntries(
    optionsPart.split(',').map((entry) => {
      const [key, value] = entry.split('=');
      return [key, Number(value)];
    }),
  );

  if (
    !Number.isFinite(options.m) ||
    !Number.isFinite(options.t) ||
    !Number.isFinite(options.p) ||
    !Number.isFinite(options.l)
  ) {
    return null;
  }

  try {
    return {
      memory: options.m,
      passes: options.t,
      parallelism: options.p,
      tagLength: options.l,
      salt: Buffer.from(saltPart, 'base64url'),
      digest: Buffer.from(digestPart, 'base64url'),
    };
  } catch {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(ARGON2_SALT_LENGTH);
  const digest = await deriveKey(password, salt, {
    memory: ARGON2_MEMORY,
    passes: ARGON2_PASSES,
    parallelism: ARGON2_PARALLELISM,
    tagLength: ARGON2_TAG_LENGTH,
  });

  return serializePasswordHash({
    memory: ARGON2_MEMORY,
    passes: ARGON2_PASSES,
    parallelism: ARGON2_PARALLELISM,
    tagLength: ARGON2_TAG_LENGTH,
    salt,
    digest,
  });
};

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  const parsedHash = parsePasswordHash(passwordHash);

  if (!parsedHash) {
    return false;
  }

  const derivedKey = await deriveKey(password, parsedHash.salt, {
    memory: parsedHash.memory,
    passes: parsedHash.passes,
    parallelism: parsedHash.parallelism,
    tagLength: parsedHash.tagLength,
  });

  if (derivedKey.length !== parsedHash.digest.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, parsedHash.digest);
};
