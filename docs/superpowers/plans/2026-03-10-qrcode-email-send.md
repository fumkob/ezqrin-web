# QRコードメール送信UI 実装計画

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 参加者管理ページにQRコードメール送信機能（一括・個別）を追加する。

**Architecture:** submoduleをpullしてAPIクライアントを再生成し、カスタムフック・ダイアログコンポーネントを新規追加する。テーブルにチェックボックスと個別送信ボタンを追加し、ページのツールバーに一括送信ボタンを組み込む。

**Tech Stack:** Next.js 16 / React 19, TanStack Query (orval生成フック), shadcn/ui (AlertDialog, Checkbox), lucide-react (Mail), sonner (toast), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-10-qrcode-email-send-design.md`

---

## Chunk 1: サブモジュール更新 & APIクライアント生成

### Task 1: サブモジュールを最新にしてAPIクライアントを再生成

**Files:**
- Modify: `server` (submodule pointer)
- Create: `src/lib/generated/qrcode/` (自動生成)

- [ ] **Step 1: serverサブモジュールを最新コミットにpull**

```bash
cd server && git pull origin main && cd ..
```

期待結果: `f15dc24 ✨ Implement QR code email distribution via POST /events/{id}/qrcodes/send (#53)` が含まれること

- [ ] **Step 2: APIクライアントを再生成**

```bash
npm run generate
```

期待結果: エラーなし。`src/lib/generated/qrcode/` ディレクトリが作成される。

- [ ] **Step 3: 生成されたファイルを確認**

```bash
ls src/lib/generated/qrcode/
```

期待結果: `qrcode.ts`（または同等ファイル）が存在すること。`sendEventQRCodes` 関数・型が含まれることを確認。

- [ ] **Step 4: lintを通す**

```bash
npm run lint
```

期待結果: エラーなし（警告があれば記録する）

- [ ] **Step 5: Commit**

```bash
git add server src/lib/generated/
git commit -m "⬆️ Update server submodule and regenerate API client with qrcode send endpoint"
```

---

## Chunk 2: カスタムフック作成

### Task 2: `use-qrcodes.ts` フックを作成

**Files:**
- Create: `src/hooks/use-qrcodes.ts`

既存フックのパターン (`src/hooks/use-participants.ts`) を参考にする。`apiFetch` は `src/lib/api/client.ts` からインポート。生成された型は `src/lib/generated/model/` から確認して正確な型名を使う。

- [ ] **Step 1: 生成された型と関数名を確認**

```bash
grep -n "SendQRCodes\|sendEventQRCodes" src/lib/generated/qrcode/*.ts
```

期待結果: `useSendEventQRCodes` フック関数と `SendQRCodesRequest`, `SendQRCodesResponse` 型が確認できる

- [ ] **Step 2: `src/hooks/use-qrcodes.ts` を作成**

```typescript
import { useSendEventQRCodes } from '@/lib/generated/qrcode/qrcode';
import type { SendQRCodesRequest, SendQRCodesResponse } from '@/lib/generated/model';

export type SendQRCodesArgs =
  | { send_to_all: true }
  | { participant_ids: string[] };

export function useSendQRCodes(eventId: string) {
  const mutation = useSendEventQRCodes();
  return {
    ...mutation,
    mutateAsync: (args: SendQRCodesArgs): Promise<SendQRCodesResponse> =>
      mutation.mutateAsync({
        id: eventId,
        data: {
          ...args,
          email_template: 'default',
        } as SendQRCodesRequest,
      }),
  };
}
```

> **注意:** 生成されたフック名・型名が上記と異なる場合はStep 1の確認結果に合わせること。

- [ ] **Step 3: lintを通す**

```bash
npm run lint
```

期待結果: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-qrcodes.ts
git commit -m "✨ Add useSendQRCodes hook"
```

---

## Chunk 3: 送信ダイアログコンポーネント

### Task 3: `SendQRCodesDialog` を作成

**Files:**
- Create: `src/components/participants/send-qrcodes-dialog.tsx`

shadcn/ui の `AlertDialog` を使う。`src/components/participants/add-participant-dialog.tsx` を参考にダイアログのパターンを踏襲する。

- [ ] **Step 1: `add-participant-dialog.tsx` のパターンを確認**

```bash
cat src/components/participants/add-participant-dialog.tsx
```

- [ ] **Step 2: AlertDialogがインストール済みか確認**

```bash
ls src/components/ui/alert-dialog.tsx
```

未インストールの場合: `npx shadcn@latest add alert-dialog`

- [ ] **Step 3: `send-qrcodes-dialog.tsx` を作成**

```typescript
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSendQRCodes } from '@/hooks/use-qrcodes';
import { toast } from 'sonner';
import { useState } from 'react';
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
  const { mutateAsync: sendQRCodes } = useSendQRCodes(eventId);
  const [isPending, setIsPending] = useState(false);

  const isSingle = !!participant;
  const count = isSingle ? 1 : selectedIds.size > 0 ? selectedIds.size : totalCount;
  const description = isSingle
    ? `${participant.name}（${participant.email}）にQRコードを送信しますか？`
    : selectedIds.size > 0
      ? `選択した ${count} 名にQRコードをメール送信します。よろしいですか？`
      : `全 ${count} 名にQRコードをメール送信します。よろしいですか？`;

  async function handleSend() {
    setIsPending(true);
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
    } finally {
      setIsPending(false);
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
          <AlertDialogAction onClick={handleSend} disabled={isPending}>
            {isPending ? '送信中...' : '送信'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 4: lintを通す**

```bash
npm run lint
```

期待結果: エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/components/participants/send-qrcodes-dialog.tsx
git commit -m "✨ Add SendQRCodesDialog component"
```

---

## Chunk 4: ParticipantTable にチェックボックスと個別送信ボタンを追加

### Task 4: `participant-table.tsx` を変更

**Files:**
- Modify: `src/components/participants/participant-table.tsx`

Checkboxコンポーネントを使う。shadcn/ui の `Checkbox` (`src/components/ui/checkbox.tsx`) を確認し、未インストールなら追加する。

- [ ] **Step 1: Checkboxがインストール済みか確認**

```bash
ls src/components/ui/checkbox.tsx
```

未インストールの場合: `npx shadcn@latest add checkbox`

- [ ] **Step 2: `participant-table.tsx` を修正**

既存の `ParticipantTableProps` に以下のpropsを追加し、テーブルを変更する:

```typescript
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
```

- [ ] **Step 3: lintを通す**

```bash
npm run lint
```

期待結果: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/components/participants/participant-table.tsx
git commit -m "✨ Add checkbox selection and individual QR send button to ParticipantTable"
```

---

## Chunk 5: ページにツールバーボタンと一括送信を組み込む

### Task 5: `participants/page.tsx` を変更

**Files:**
- Modify: `src/app/(admin)/events/[id]/participants/page.tsx`

- [ ] **Step 1: `participants/page.tsx` を修正**

以下の変更を加える:
1. `selectedIds` state を追加 (`useState<Set<string>>(new Set())`)
2. `sendDialogOpen` state を追加 (`useState(false)`)
3. `ParticipantTable` に `eventId`, `selectedIds`, `onSelectionChange` を渡す
4. ツールバーに送信ボタンと `SendQRCodesDialog` を追加

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Upload, Download, ArrowLeft, Mail } from 'lucide-react';
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
import type { CreateParticipantRequest, Participant } from '@/lib/generated/model';

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const { data: event } = useEvent(id);
  const { data, isLoading } = useParticipants(id, { search: search || undefined });
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
          <p className="text-sm text-muted-foreground">全 {totalCount} 名</p>
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
```

- [ ] **Step 2: lintを通す**

```bash
npm run lint
```

期待結果: エラーなし

- [ ] **Step 3: 開発サーバーで動作確認**

```bash
npm run dev
```

確認項目:
- [ ] 参加者管理ページにチェックボックスが表示される
- [ ] チェックボックス選択でツールバーボタンのラベルが変わる
- [ ] 「QRコード送信」ボタンクリックで確認ダイアログが表示される
- [ ] 行の `Mail` ボタンクリックで個別送信確認ダイアログが表示される
- [ ] 全体選択チェックボックスが正しく動作する

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/events/[id]/participants/page.tsx
git commit -m "✨ Add bulk QR code send button to participants toolbar"
```
