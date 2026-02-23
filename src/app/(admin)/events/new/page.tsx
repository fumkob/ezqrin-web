'use client';

import { useRouter } from 'next/navigation';
import { EventForm } from '@/components/events/event-form';
import { useCreateEvent } from '@/hooks/use-events';
import { toast } from 'sonner';
import type { CreateEventRequest } from '@/lib/generated/model';

export default function NewEventPage() {
  const router = useRouter();
  const { mutateAsync, isPending } = useCreateEvent();

  async function handleSubmit(data: CreateEventRequest) {
    try {
      const event = await mutateAsync(data);
      toast.success('イベントを作成しました');
      router.push(`/events/${event.id}`);
    } catch {
      toast.error('イベントの作成に失敗しました');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新規イベント作成</h1>
      <EventForm onSubmit={handleSubmit} isLoading={isPending} />
    </div>
  );
}
