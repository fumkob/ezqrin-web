import { useQueryClient } from '@tanstack/react-query';
import {
  useGetEvents,
  useGetEventsId,
  useGetEventsIdStats,
  usePostEvents,
  usePutEventsId,
  useDeleteEventsId,
} from '@/lib/generated/events/events';
import type {
  GetEventsParams,
  UpdateEventRequest,
  CreateEventRequest,
  Event,
  EventListResponse,
  EventStatsResponse,
} from '@/lib/generated/model';

export const eventKeys = {
  all: ['/events'] as const,
  list: (params?: object) => [...eventKeys.all, ...(params ? [params] : [])] as const,
  detail: (id: string) => [`/events/${id}`] as const,
  stats: (id: string) => [`/events/${id}/stats`] as const,
};

export function useEvents(params?: GetEventsParams) {
  return useGetEvents(params, {
    query: { select: (res) => res as unknown as EventListResponse },
  });
}

export function useEvent(id: string) {
  return useGetEventsId(id, {
    query: { select: (res) => res as unknown as Event },
  });
}

export function useEventStats(id: string) {
  return useGetEventsIdStats(id, {
    query: {
      refetchInterval: 30_000,
      select: (res) => res as unknown as EventStatsResponse,
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const mutation = usePostEvents({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
    },
  });
  return {
    ...mutation,
    mutateAsync: (data: CreateEventRequest) =>
      mutation.mutateAsync({ data }).then((res) => res as unknown as Event),
  };
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient();
  const mutation = usePutEventsId({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
    },
  });
  return {
    ...mutation,
    mutateAsync: (data: UpdateEventRequest) =>
      mutation.mutateAsync({ id, data }).then((res) => res as unknown as Event),
  };
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  const mutation = useDeleteEventsId({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
    },
  });
  return {
    ...mutation,
    mutateAsync: (deleteId: string) => mutation.mutateAsync({ id: deleteId }),
  };
}
