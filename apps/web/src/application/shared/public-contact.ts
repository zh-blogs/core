export const getPublicContactEmail = (): string => 'contact@mail.zhblogs.net';

export const getPublicContactMailtoHref = (): string | null => {
  const email = getPublicContactEmail();
  return email ? `mailto:${email}` : null;
};
