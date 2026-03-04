'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useCheckins, usePerformCheckin } from '@/hooks/use-checkins';
import { useEvent } from '@/hooks/use-events';
import { useDateLocale } from '@/hooks/use-locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CheckinTab = 'employee_id' | 'qrcode' | 'participant_id';

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const [input, setInput] = useState('');
  const { data: event } = useEvent(id);
  const { data: checkins, isLoading } = useCheckins(id);
  const { mutateAsync: performCheckin, isPending } = usePerformCheckin(id);
  const locale = useDateLocale();

  async function handleCheckin(e: React.FormEvent, tab: CheckinTab) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;

    const checkinData =
      tab === 'qrcode'
        ? { qr_code: value, method: 'qrcode' as const }
        : tab === 'participant_id'
          ? { participant_id: value, method: 'manual' as const }
          : { employee_id: value, method: 'manual' as const };

    try {
      const result = await performCheckin(checkinData);
      toast.success(`${result.participant.name} さんのチェックインが完了しました`);
      setInput('');
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr.code === 'CONFLICT') {
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
          <CardTitle>チェックイン</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="employee_id" onValueChange={() => setInput('')}>
            <TabsList className="w-full">
              <TabsTrigger value="employee_id" className="flex-1">社員ID</TabsTrigger>
              <TabsTrigger value="qrcode" className="flex-1">QRコード</TabsTrigger>
              <TabsTrigger value="participant_id" className="flex-1">参加者ID</TabsTrigger>
            </TabsList>

            <TabsContent value="employee_id">
              <form onSubmit={(e) => handleCheckin(e, 'employee_id')} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>社員ID</Label>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="EMP001..."
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending || !input.trim()}>
                  {isPending ? 'チェックイン中...' : 'チェックイン'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="qrcode">
              <form onSubmit={(e) => handleCheckin(e, 'qrcode')} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>QRコード</Label>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="QRコードをスキャン..."
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending || !input.trim()}>
                  {isPending ? 'チェックイン中...' : 'チェックイン'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="participant_id">
              <form onSubmit={(e) => handleCheckin(e, 'participant_id')} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>参加者ID</Label>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending || !input.trim()}>
                  {isPending ? 'チェックイン中...' : 'チェックイン'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
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
                    {format(new Date(ci.checked_in_at), 'p', { locale })}
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
