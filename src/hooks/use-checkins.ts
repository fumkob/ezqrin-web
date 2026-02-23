import { useQueryClient } from '@tanstack/react-query';
import {
  useCheckInParticipant,
  useListCheckIns,
} from '@/lib/generated/checkin/checkin';
import { eventKeys } from './use-events';
import { participantKeys } from './use-participants';
import type { CheckInRequest } from '@/lib/generated/model';

export const checkinKeys = {
  list: (eventId: string) => ['checkins', eventId] as const,
};

export function useCheckins(eventId: string) {
  return useListCheckIns(eventId, { per_page: 50 }, {
    query: { refetchInterval: 15_000 },
  });
}

export function usePerformCheckin(eventId: string) {
  const qc = useQueryClient();
  const mutation = useCheckInParticipant({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: checkinKeys.list(eventId) });
        qc.invalidateQueries({ queryKey: participantKeys.all(eventId) });
        qc.invalidateQueries({ queryKey: eventKeys.stats(eventId) });
      },
    },
  });
  return {
    ...mutation,
    mutateAsync: (data: CheckInRequest) => mutation.mutateAsync({ id: eventId, data }),
  };
}
