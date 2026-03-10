'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Upload, Download, ArrowLeft, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useParticipants,
  useAddParticipant,
  useUpdateParticipant,
  useDeleteParticipant,
  useImportParticipants,
  useExportParticipants,
} from '@/hooks/use-participants';
import { useEvent } from '@/hooks/use-events';
import { ParticipantTable } from '@/components/participants/participant-table';
import { AddParticipantDialog } from '@/components/participants/add-participant-dialog';
import { SendQRCodesDialog } from '@/components/participants/send-qrcodes-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateParticipantRequest, Participant } from '@/lib/generated/model';

const PER_PAGE_OPTIONS = [20, 50, 100];

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const { data: event } = useEvent(id);
  const { data, isLoading } = useParticipants(id, {
    search: search || undefined,
    page,
    per_page: perPage,
  });
  const { mutateAsync: addParticipant } = useAddParticipant(id);
  const { mutateAsync: updateParticipant } = useUpdateParticipant(id);
  const { mutateAsync: deleteParticipant } = useDeleteParticipant(id);
  const { mutateAsync: importCSV } = useImportParticipants(id);
  const { exportCSV } = useExportParticipants(id);

  const totalCount = data?.meta.total ?? 0;
  const sendLabel =
    selectedIds.size > 0
      ? `QRコード送信 (選択 ${selectedIds.size} 名)`
      : `QRコード送信 (全 ${totalCount} 名)`;

  async function handleAdd(req: CreateParticipantRequest) {
    try {
      await addParticipant(req);
      toast.success('参加者を追加しました');
    } catch {
      toast.error('追加に失敗しました');
    }
  }

  async function handleStatusChange(participantId: string, status: string) {
    try {
      await updateParticipant({ id: participantId, data: { status: status as Participant['status'] } });
    } catch {
      toast.error('ステータスの更新に失敗しました');
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

  async function handleExport() {
    try {
      await exportCSV(event ? `participants_${event.name}.csv` : undefined);
    } catch {
      toast.error('CSVエクスポートに失敗しました');
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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <AddParticipantDialog onAdd={handleAdd} />
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />CSV インポート
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />CSV エクスポート
        </Button>
        <Button variant="outline" onClick={() => setSendDialogOpen(true)} disabled={totalCount === 0}>
          <Mail className="h-4 w-4 mr-2" />{sendLabel}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : (
        <>
          <ParticipantTable
            eventId={id}
            participants={(data?.data as Participant[] | undefined) ?? []}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>表示件数:</span>
              <Select
                value={String(perPage)}
                onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}件</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>全 {totalCount} 名</span>
            </div>
            {(data?.meta.total_pages ?? 1) > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2">
                  {page} / {data?.meta.total_pages ?? 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(data?.meta.total_pages ?? 1, p + 1))}
                  disabled={page >= (data?.meta.total_pages ?? 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <SendQRCodesDialog
        eventId={id}
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        selectedIds={selectedIds}
        totalCount={totalCount}
      />
    </div>
  );
}
