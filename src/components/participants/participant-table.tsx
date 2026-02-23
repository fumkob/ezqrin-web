'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle } from 'lucide-react';
import type { Participant } from '@/lib/generated/model';

const statusLabels: Record<string, string> = {
  tentative: '仮参加',
  confirmed: '参加確定',
  cancelled: 'キャンセル',
  declined: '不参加',
};

interface ParticipantTableProps {
  participants: Participant[];
  onDelete: (id: string) => void;
}

export function ParticipantTable({ participants, onDelete }: ParticipantTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>社員ID</TableHead>
          <TableHead>メールアドレス</TableHead>
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
              <Badge variant="secondary">{statusLabels[p.status] ?? p.status}</Badge>
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
