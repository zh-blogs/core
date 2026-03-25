import type { GithubIdentity } from '@/domain/auth/types/auth.types';

const GITHUB_HEADERS = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'zhblogs-api',
});

export const fetchGithubIdentity = async (accessToken: string): Promise<GithubIdentity> => {
  const [profileResponse, emailResponse] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers: GITHUB_HEADERS(accessToken),
    }),
    fetch('https://api.github.com/user/emails', {
      headers: GITHUB_HEADERS(accessToken),
    }),
  ]);

  if (!profileResponse.ok || !emailResponse.ok) {
    throw new Error('failed to fetch github user profile');
  }

  const profile = (await profileResponse.json()) as {
    id: number;
    login: string;
    name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  };
  const emails = (await emailResponse.json()) as Array<{
    email: string;
    primary?: boolean;
    verified?: boolean;
  }>;

  const primaryEmail =
    emails.find((entry) => entry.primary && entry.verified)?.email ??
    emails.find((entry) => entry.verified)?.email ??
    profile.email ??
    `${profile.login}@users.noreply.github.com`;

  return {
    githubUserId: String(profile.id),
    login: profile.login,
    nickname: profile.name?.trim() || profile.login,
    avatarUrl: profile.avatar_url ?? null,
    email: primaryEmail,
    rawProfile: profile as Record<string, unknown>,
  };
};
