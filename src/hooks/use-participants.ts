import { useQueryClient } from '@tanstack/react-query';
import {
  useListParticipants,
  useCreateParticipant,
  useUpdateParticipant as useUpdateParticipantGenerated,
  useDeleteParticipant as useDeleteParticipantGenerated,
} from '@/lib/generated/participants/participants';
import { apiFetch, apiFetchBlob } from '@/lib/api/client';
import type { CreateParticipantRequest, UpdateParticipantRequest, ListParticipantsParams, ParticipantListResponse } from '@/lib/generated/model';

export const participantKeys = {
  all: (eventId: string) => [`/events/${eventId}/participants`] as const,
  list: (eventId: string, params?: object) =>
    [...participantKeys.all(eventId), params] as const,
};

export function useParticipants(eventId: string, params?: ListParticipantsParams) {
  return useListParticipants(eventId, params, {
    query: { select: (res) => res as unknown as ParticipantListResponse },
  });
}

export function useAddParticipant(eventId: string) {
  const qc = useQueryClient();
  const mutation = useCreateParticipant({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
    },
  });
  return {
    ...mutation,
    mutateAsync: (data: CreateParticipantRequest) => mutation.mutateAsync({ id: eventId, data }),
  };
}

export function useUpdateParticipant(eventId: string) {
  const qc = useQueryClient();
  const mutation = useUpdateParticipantGenerated({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
    },
  });
  return {
    ...mutation,
    mutateAsync: ({ id, data }: { id: string; data: UpdateParticipantRequest }) =>
      mutation.mutateAsync({ id, data }),
  };
}

export function useDeleteParticipant(eventId: string) {
  const qc = useQueryClient();
  const mutation = useDeleteParticipantGenerated({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: participantKeys.all(eventId) }),
    },
  });
  return {
    ...mutation,
    mutateAsync: (id: string) => mutation.mutateAsync({ id }),
  };
}

export function useExportParticipants(eventId: string) {
  const exportCSV = async (filename?: string) => {
    const blob = await apiFetchBlob(`/events/${eventId}/participants/export`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `participants_${eventId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return { exportCSV };
}

export function useImportParticipants(eventId: string) {
  const qc = useQueryClient();
  const mutateAsync = async (file: File, skipDuplicates = true) => {
    const formData = new FormData();
    formData.append('file', file);
    const result = await apiFetch<{ imported_count: number; skipped_count: number; failed_count: number }>(
      `/events/${eventId}/participants/import?skip_duplicates=${skipDuplicates}`,
      { method: 'POST', body: formData },
    );
    await qc.invalidateQueries({ queryKey: participantKeys.all(eventId) });
    return result;
  };
  return { mutateAsync };
}
