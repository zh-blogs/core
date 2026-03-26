import { getApiBaseUrl } from '../auth/auth.server';

export const fetchApiJson = async <T>(path: string): Promise<T | null> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
};
