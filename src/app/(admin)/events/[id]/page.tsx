'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Edit, Trash2, Users, ClipboardCheck } from 'lucide-react';
import { useEvent, useEventStats, useDeleteEvent } from '@/hooks/use-events';
import { useDateLocale } from '@/hooks/use-locale';
import { EventStatsCard } from '@/components/events/event-stats-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '下書き', variant: 'secondary' },
  published: { label: '公開中', variant: 'default' },
  ongoing: { label: '開催中', variant: 'default' },
  completed: { label: '終了', variant: 'outline' },
  cancelled: { label: 'キャンセル', variant: 'destructive' },
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEvent(id);
  const { data: stats } = useEventStats(id);
  const { mutateAsync: deleteEvent } = useDeleteEvent();
  const locale = useDateLocale();

  async function handleDelete() {
    if (!confirm('このイベントを削除しますか？この操作は取り消せません。')) return;
    try {
      await deleteEvent(id);
      toast.success('イベントを削除しました');
      router.push('/dashboard');
    } catch {
      toast.error('削除に失敗しました');
    }
  }

  if (isLoading) return <div className="text-muted-foreground">読み込み中...</div>;
  if (!event) return <div className="text-muted-foreground">イベントが見つかりません</div>;

  const status = statusConfig[event.status] ?? { label: event.status, variant: 'secondary' as const };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground">
            {format(new Date(event.start_date), 'PPp', { locale })}
            {event.end_date &&
              ` 〜 ${format(new Date(event.end_date), 'p', { locale })}`}
            {event.location && ` ｜ ${event.location}`}
          </p>
          {event.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">{event.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href={`/events/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />編集
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />削除
          </Button>
        </div>
      </div>

      {stats && <EventStatsCard stats={stats} />}

      <div className="flex gap-3">
        <Button asChild>
          <Link href={`/events/${id}/participants`}>
            <Users className="h-4 w-4 mr-2" />参加者管理
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/events/${id}/checkin`}>
            <ClipboardCheck className="h-4 w-4 mr-2" />チェックイン
          </Link>
        </Button>
      </div>
    </div>
  );
}
