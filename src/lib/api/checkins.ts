import { apiFetch } from './client';
import type { CheckIn, PerformCheckinRequest, PaginatedResponse } from '@/types/api';

export async function performCheckin(
  eventId: string,
  req: PerformCheckinRequest,
): Promise<CheckIn> {
  return apiFetch<CheckIn>(`/events/${eventId}/checkin`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function listCheckins(
  eventId: string,
  params?: { page?: number; per_page?: number; search?: string },
): Promise<PaginatedResponse<CheckIn>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  if (params?.search) qs.set('search', params.search);
  return apiFetch<PaginatedResponse<CheckIn>>(`/events/${eventId}/checkins?${qs}`);
}
