const usernamePattern = /^[A-Za-z0-9_-]{3,32}$/;

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const normalizeUsername = (value: string): string => value.trim();

export const validateUsername = (value: string): boolean =>
  usernamePattern.test(normalizeUsername(value));

export const validatePassword = (value: string): boolean =>
  value.length >= 8 && value.length <= 128;

export const isEmailIdentifier = (value: string): boolean => normalizeEmail(value).includes('@');
