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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, CheckCircle, ExternalLink } from 'lucide-react';
import type { Participant } from '@/lib/generated/model';
import { ParticipantStatus } from '@/lib/generated/model';

const statusLabels: Record<string, string> = {
  [ParticipantStatus.tentative]: '仮参加',
  [ParticipantStatus.confirmed]: '参加',
  [ParticipantStatus.cancelled]: 'キャンセル',
  [ParticipantStatus.declined]: '不参加',
};

interface ParticipantTableProps {
  participants: Participant[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function ParticipantTable({ participants, onDelete, onStatusChange }: ParticipantTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>社員ID</TableHead>
          <TableHead>メールアドレス</TableHead>
          <TableHead>QR配布URL</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>チェックイン</TableHead>
          <TableHead className="w-16"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.map((p) => (
          <TableRow key={p.id}>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(p.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
