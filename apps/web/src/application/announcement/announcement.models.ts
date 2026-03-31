export interface CurrentAnnouncement {
  id: string;
  title: string;
  content: string | null;
  publishTime: string | null;
}

export interface AnnouncementArchiveItem {
  id: string;
  title: string;
  content: string | null;
  status: 'PUBLISHED' | 'EXPIRED';
  publishTime: string | null;
  expireTime: string | null;
}

export interface AnnouncementPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AnnouncementArchiveResult {
  items: AnnouncementArchiveItem[];
  pagination: AnnouncementPagination;
}
