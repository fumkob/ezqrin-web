'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useSendQRCodes } from '@/hooks/use-qrcodes';
import { toast } from 'sonner';
import type { Participant } from '@/lib/generated/model';

interface SendQRCodesDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // 一括送信時: selectedIds が空なら全員、ある場合は選択者
  selectedIds: Set<string>;
  totalCount: number;
  // 個別送信時のみ: participant を渡す
  participant?: Pick<Participant, 'id' | 'name' | 'email'>;
}

export function SendQRCodesDialog({
  eventId,
  open,
  onOpenChange,
  selectedIds,
  totalCount,
  participant,
}: SendQRCodesDialogProps) {
  const { mutateAsync: sendQRCodes, isPending } = useSendQRCodes(eventId);

  const isSingle = !!participant;
  const count = selectedIds.size > 0 ? selectedIds.size : totalCount;
  const description = isSingle
    ? `${participant.name}（${participant.email}）にQRコードを送信しますか？`
    : selectedIds.size > 0
      ? `選択した ${count} 名にQRコードをメール送信します。よろしいですか？`
      : `全 ${count} 名にQRコードをメール送信します。よろしいですか？`;

  async function handleSend() {
    try {
      const args = isSingle
        ? { participant_ids: [participant.id] }
        : selectedIds.size > 0
          ? { participant_ids: Array.from(selectedIds) }
          : { send_to_all: true as const };
      const result = await sendQRCodes(args);

      if (result.failed_count === 0) {
        toast.success(`${result.sent_count} 名にQRコードを送信しました`);
      } else {
        const failedEmails = result.failures.map((f) => f.email).join(', ');
        toast.warning(
          `${result.sent_count} 名に送信しました（${result.failed_count} 名失敗: ${failedEmails}）`,
        );
      }
      onOpenChange(false);
    } catch {
      toast.error('送信に失敗しました');
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>QRコード送信</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? '送信中...' : '送信'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
