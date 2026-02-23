import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats,
} from '@/lib/api/events';
import type { CreateEventRequest } from '@/types/api';

export const eventKeys = {
  all: ['events'] as const,
  list: (params?: object) => [...eventKeys.all, 'list', params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  stats: (id: string) => [...eventKeys.all, 'stats', id] as const,
};

export function useEvents(params?: { page?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => listEvents(params),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEvent(id),
  });
}

export function useEventStats(id: string) {
  return useQuery({
    queryKey: eventKeys.stats(id),
    queryFn: () => getEventStats(id),
    refetchInterval: 30_000,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Partial<CreateEventRequest>) => updateEvent(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}
