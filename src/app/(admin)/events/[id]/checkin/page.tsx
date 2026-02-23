'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useCheckins, usePerformCheckin } from '@/hooks/use-checkins';
import { useEvent } from '@/hooks/use-events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const [participantId, setParticipantId] = useState('');
  const { data: event } = useEvent(id);
  const { data: checkins, isLoading } = useCheckins(id);
  const { mutateAsync: performCheckin, isPending } = usePerformCheckin(id);

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!participantId.trim()) return;
    try {
      const result = await performCheckin({
        participant_id: participantId.trim(),
        method: 'manual',
      });
      toast.success(`${result.participant.name} さんのチェックインが完了しました`);
      setParticipantId('');
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr.code === 'CHECKIN_ALREADY_CHECKED_IN') {
        toast.error('この参加者はすでにチェックイン済みです');
      } else {
        toast.error('チェックインに失敗しました');
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/events/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{event?.name} - チェックイン</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>手動チェックイン</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckin} className="space-y-4">
            <div className="space-y-2">
              <Label>参加者ID または QRコード</Label>
              <Input
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="参加者IDを入力..."
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !participantId.trim()}
            >
              {isPending ? 'チェックイン中...' : 'チェックイン'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">チェックイン履歴</h2>
        {isLoading ? (
          <p className="text-muted-foreground">読み込み中...</p>
        ) : (
          <div className="space-y-2">
            {checkins?.checkins?.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center justify-between p-3 bg-white rounded-md border"
              >
                <div>
                  <p className="font-medium">{ci.participant.name}</p>
                  <p className="text-sm text-muted-foreground">{ci.participant.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">
                    {ci.checkin_method === 'qrcode' ? 'QR' : '手動'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(ci.checked_in_at), 'HH:mm', { locale: ja })}
                  </p>
                </div>
              </div>
            ))}
            {(checkins?.checkins?.length ?? 0) === 0 && (
              <p className="text-muted-foreground">まだチェックインがありません</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
