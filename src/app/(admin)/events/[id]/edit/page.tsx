'use client';

import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useEvent, useUpdateEvent } from '@/hooks/use-events';
import { EventForm } from '@/components/events/event-form';
import type { CreateEventRequest } from '@/types/api';

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const { mutateAsync, isPending } = useUpdateEvent(id);

  async function handleSubmit(data: CreateEventRequest) {
    try {
      await mutateAsync(data);
      toast.success('イベントを更新しました');
      router.push(`/events/${id}`);
    } catch {
      toast.error('更新に失敗しました');
    }
  }

  if (isLoading) return <div className="text-muted-foreground">読み込み中...</div>;
  if (!event) return <div className="text-muted-foreground">イベントが見つかりません</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">イベント編集</h1>
      <EventForm defaultValues={event} onSubmit={handleSubmit} isLoading={isPending} />
    </div>
  );
}
