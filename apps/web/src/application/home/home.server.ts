import { fetchApiJson } from '../api/api.server';

export interface HomeSummary {
  totalSites: number;
  featuredSites: number;
  todayUpdates: number;
}

interface HomePayload {
  ok: boolean;
  data: {
    summary: HomeSummary;
  };
}

export const readHomeSummary = async (fallback: HomeSummary): Promise<HomeSummary> => {
  const payload = await fetchApiJson<HomePayload>('/api/home');

  return payload?.data.summary ?? fallback;
};
