'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Upload, Download, ArrowLeft } from 'lucide-react';
import {
  useParticipants,
  useAddParticipant,
  useDeleteParticipant,
  useImportParticipants,
} from '@/hooks/use-participants';
import { useEvent } from '@/hooks/use-events';
import { ParticipantTable } from '@/components/participants/participant-table';
import { AddParticipantDialog } from '@/components/participants/add-participant-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CreateParticipantRequest } from '@/types/api';

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const { data: event } = useEvent(id);
  const { data, isLoading } = useParticipants(id, { search: search || undefined });
  const { mutateAsync: addParticipant } = useAddParticipant(id);
  const { mutateAsync: deleteParticipant } = useDeleteParticipant(id);
  const { mutateAsync: importCSV } = useImportParticipants(id);

  async function handleAdd(req: CreateParticipantRequest) {
    try {
      await addParticipant(req);
      toast.success('参加者を追加しました');
    } catch {
      toast.error('追加に失敗しました');
    }
  }

  async function handleDelete(participantId: string) {
    if (!confirm('この参加者を削除しますか？')) return;
    try {
      await deleteParticipant(participantId);
      toast.success('参加者を削除しました');
    } catch {
      toast.error('削除に失敗しました');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importCSV(file);
      toast.success(
        `${result.imported_count}名をインポートしました（スキップ: ${result.skipped_count}名）`,
      );
    } catch {
      toast.error('CSVインポートに失敗しました');
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/events/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{event?.name} - 参加者管理</h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="名前・メールで検索..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AddParticipantDialog onAdd={handleAdd} />
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />CSV インポート
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
        </Button>
        <Button variant="outline" asChild>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/events/${id}/participants/export`}
            download
          >
            <Download className="h-4 w-4 mr-2" />CSV エクスポート
          </a>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : (
        <>
          <ParticipantTable participants={data?.data ?? []} onDelete={handleDelete} />
          <p className="text-sm text-muted-foreground">全 {data?.meta.total ?? 0} 名</p>
        </>
      )}
    </div>
  );
}
