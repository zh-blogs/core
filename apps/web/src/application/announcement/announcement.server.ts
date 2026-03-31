import type {
  AnnouncementArchiveResult,
  CurrentAnnouncement,
} from '@/application/announcement/announcement.models';
import { getApiBaseUrl } from '@/application/auth/auth.server';

type Envelope<T> = {
  ok: boolean;
  data: T;
};

async function fetchEnvelope<T>(path: string): Promise<Envelope<T> | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Envelope<T>;
  } catch {
    return null;
  }
}

export const readCurrentAnnouncement = async (): Promise<CurrentAnnouncement | null> => {
  const payload = await fetchEnvelope<CurrentAnnouncement | null>('/api/announcements/current');
  return payload?.data ?? null;
};

export const readAnnouncementArchive = async (
  page = 1,
  pageSize = 20,
): Promise<AnnouncementArchiveResult | null> => {
  const payload = await fetchEnvelope<AnnouncementArchiveResult>(
    `/api/announcements?page=${page}&pageSize=${pageSize}`,
  );

  return payload?.data ?? null;
};
