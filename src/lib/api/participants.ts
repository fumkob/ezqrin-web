import { apiFetch } from './client';
import type { Participant, CreateParticipantRequest, PaginatedResponse } from '@/types/api';

export async function listParticipants(
  eventId: string,
  params?: { page?: number; per_page?: number; status?: string; search?: string; checked_in?: boolean },
): Promise<PaginatedResponse<Participant>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.checked_in !== undefined) qs.set('checked_in', String(params.checked_in));
  return apiFetch<PaginatedResponse<Participant>>(`/events/${eventId}/participants?${qs}`);
}

export async function addParticipant(
  eventId: string,
  req: CreateParticipantRequest,
): Promise<Participant> {
  return apiFetch<Participant>(`/events/${eventId}/participants`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function updateParticipant(
  eventId: string,
  participantId: string,
  req: Partial<CreateParticipantRequest>,
): Promise<Participant> {
  return apiFetch<Participant>(`/events/${eventId}/participants/${participantId}`, {
    method: 'PATCH',
    body: JSON.stringify(req),
  });
}

export async function deleteParticipant(eventId: string, participantId: string): Promise<void> {
  return apiFetch<void>(`/events/${eventId}/participants/${participantId}`, { method: 'DELETE' });
}

export async function importParticipantsCSV(
  eventId: string,
  file: File,
  skipDuplicates = true,
): Promise<{ imported_count: number; skipped_count: number; failed_count: number }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`/events/${eventId}/participants/import?skip_duplicates=${skipDuplicates}`, {
    method: 'POST',
    body: formData,
  });
}
