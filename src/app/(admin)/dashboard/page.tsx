'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useEvents } from '@/hooks/use-events';
import { EventCard } from '@/components/events/event-card';
import type { Event, EventStatus } from '@/lib/generated/model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const { data, isLoading } = useEvents({
    name: search || undefined,
    status: status === 'all' ? undefined : (status as EventStatus),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">イベント一覧</h1>
        <Button asChild>
          <Link href="/events/new">
            <Plus className="h-4 w-4 mr-2" />
            新規イベント作成
          </Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="イベント名で検索..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="published">公開中</SelectItem>
            <SelectItem value="ongoing">開催中</SelectItem>
            <SelectItem value="completed">終了</SelectItem>
            <SelectItem value="cancelled">キャンセル</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.data as Event[] | undefined)?.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {((data?.data as Event[] | undefined)?.length ?? 0) === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">
              イベントが見つかりません
            </p>
          )}
        </div>
      )}
    </div>
  );
}
