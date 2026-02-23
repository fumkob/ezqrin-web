import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { Event } from '@/lib/generated/model';

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: '下書き', variant: 'secondary' },
  published: { label: '公開中', variant: 'default' },
  ongoing: { label: '開催中', variant: 'default' },
  completed: { label: '終了', variant: 'outline' },
  cancelled: { label: 'キャンセル', variant: 'destructive' },
};

export function EventCard({ event }: { event: Event }) {
  const status = statusConfig[event.status] ?? { label: event.status, variant: 'secondary' as const };

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{event.name}</CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{format(new Date(event.start_date), 'yyyy年M月d日(E) HH:mm', { locale: ja })}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {event.participant_count !== undefined && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <span>
                {event.checked_in_count ?? 0} / {event.participant_count} 名チェックイン
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
