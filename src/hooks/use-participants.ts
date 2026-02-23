import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listParticipants,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  importParticipantsCSV,
} from '@/lib/api/participants';
import type { CreateParticipantRequest } from '@/types/api';

export const participantKeys = {
  all: (eventId: string) => ['participants', eventId] as const,
  list: (eventId: string, params?: object) =>
    [...participantKeys.all(eventId), params] as const,
};

export function useParticipants(
  eventId: string,
  params?: { page?: number; status?: string; search?: string; checked_in?: boolean },
) {
  return useQuery({
    queryKey: participantKeys.list(eventId, params),
    queryFn: () => listParticipants(eventId, params),
  });
}

export function useAddParticipant(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateParticipantRequest) => addParticipant(eventId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
  });
}

export function useUpdateParticipant(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateParticipantRequest> }) =>
      updateParticipant(eventId, id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
  });
}

export function useDeleteParticipant(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => deleteParticipant(eventId, participantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
  });
}

export function useImportParticipants(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importParticipantsCSV(eventId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
  });
}
