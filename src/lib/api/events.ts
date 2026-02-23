import { apiFetch } from './client';
import type { Event, CreateEventRequest, EventStats, PaginatedResponse } from '@/types/api';

export async function listEvents(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedResponse<Event>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  return apiFetch<PaginatedResponse<Event>>(`/events?${qs}`);
}

export async function getEvent(id: string): Promise<Event> {
  return apiFetch<Event>(`/events/${id}`);
}

export async function createEvent(req: CreateEventRequest): Promise<Event> {
  return apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(req) });
}

export async function updateEvent(id: string, req: Partial<CreateEventRequest>): Promise<Event> {
  return apiFetch<Event>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(req) });
}

export async function deleteEvent(id: string): Promise<void> {
  return apiFetch<void>(`/events/${id}`, { method: 'DELETE' });
}

export async function getEventStats(id: string): Promise<EventStats> {
  return apiFetch<EventStats>(`/events/${id}/stats`);
}
