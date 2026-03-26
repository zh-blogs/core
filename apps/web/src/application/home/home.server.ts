import { fetchApiJson } from '../api/api.server';

export interface HomeSummary {
  totalSites: number;
  featuredSites: number;
  todayUpdates: number;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  summary: string;
  tag: string;
  publishTime: string | null;
}

interface HomePayload {
  ok: boolean;
  data: {
    summary: HomeSummary;
  };
}

interface AnnouncementPayload {
  ok: boolean;
  data: {
    items: AnnouncementItem[];
  };
}

export const readHomeSummary = async (fallback: HomeSummary): Promise<HomeSummary> => {
  const payload = await fetchApiJson<HomePayload>('/api/home');

  return payload?.data.summary ?? fallback;
};

export const readAnnouncements = async (): Promise<AnnouncementItem[]> => {
  const payload = await fetchApiJson<AnnouncementPayload>('/api/announcements');

  return payload?.data.items ?? [];
};
