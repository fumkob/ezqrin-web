'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, CheckCircle, ExternalLink, Mail } from 'lucide-react';
import { useState } from 'react';
import type { Participant } from '@/lib/generated/model';
import { ParticipantStatus } from '@/lib/generated/model';
import { SendQRCodesDialog } from './send-qrcodes-dialog';

const statusLabels: Record<string, string> = {
  [ParticipantStatus.tentative]: '仮参加',
  [ParticipantStatus.confirmed]: '参加',
  [ParticipantStatus.cancelled]: 'キャンセル',
  [ParticipantStatus.declined]: '不参加',
};

interface ParticipantTableProps {
  eventId: string;
  participants: Participant[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function ParticipantTable({
  eventId,
  participants,
  selectedIds,
  onSelectionChange,
  onDelete,
  onStatusChange,
}: ParticipantTableProps) {
  const [sendTarget, setSendTarget] = useState<Pick<Participant, 'id' | 'name' | 'email'> | null>(null);

  const allChecked = participants.length > 0 && participants.every((p) => selectedIds.has(p.id));
  const someChecked = participants.some((p) => selectedIds.has(p.id));

  function toggleAll() {
    if (allChecked) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(participants.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                onCheckedChange={toggleAll}
                aria-label="全選択"
              />
            </TableHead>
            <TableHead>名前</TableHead>
            <TableHead>社員ID</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>QR配布URL</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>チェックイン</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((p) => (
            <TableRow key={p.id} data-state={selectedIds.has(p.id) ? 'selected' : undefined}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(p.id)}
                  onCheckedChange={() => toggleOne(p.id)}
                  aria-label={`${p.name}を選択`}
                />
              </TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-muted-foreground">{p.employee_id ?? '-'}</TableCell>
              <TableCell className="text-muted-foreground">{p.email}</TableCell>
              <TableCell>
                {p.qr_distribution_url ? (
                  <a
                    href={p.qr_distribution_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary text-sm hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    リンク
                  </a>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <Select value={p.status} onValueChange={(value) => onStatusChange(p.id, value)}>
                  <SelectTrigger className="w-32 h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {p.checked_in ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />済み
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">未</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSendTarget({ id: p.id, name: p.name, email: p.email })}
                    aria-label={`${p.name}にQRコードを送信`}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(p.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {sendTarget && (
        <SendQRCodesDialog
          eventId={eventId}
          open={!!sendTarget}
          onOpenChange={(open) => { if (!open) setSendTarget(null); }}
          selectedIds={new Set([sendTarget.id])}
          totalCount={1}
          participant={sendTarget}
        />
      )}
    </>
  );
}
