import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performCheckin, listCheckins } from '@/lib/api/checkins';
import { eventKeys } from './use-events';
import { participantKeys } from './use-participants';
import type { PerformCheckinRequest } from '@/types/api';

export const checkinKeys = {
  list: (eventId: string) => ['checkins', eventId] as const,
};

export function useCheckins(eventId: string) {
  return useQuery({
    queryKey: checkinKeys.list(eventId),
    queryFn: () => listCheckins(eventId, { per_page: 50 }),
    refetchInterval: 15_000,
  });
}

export function usePerformCheckin(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: PerformCheckinRequest) => performCheckin(eventId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checkinKeys.list(eventId) });
      qc.invalidateQueries({ queryKey: participantKeys.all(eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.stats(eventId) });
    },
  });
}
