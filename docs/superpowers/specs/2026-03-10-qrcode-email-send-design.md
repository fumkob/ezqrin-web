# QRコードメール送信UI 設計ドキュメント

**日付:** 2026-03-10
**対象API:** `POST /events/{id}/qrcodes/send`

## 概要

参加者管理ページにQRコードメール送信機能を追加する。一括送信（全員または選択した参加者）と個別送信の両方に対応する。

## APIの仕様

### エンドポイント
`POST /events/{id}/qrcodes/send`

### リクエスト
```json
{
  "participant_ids": ["uuid1", "uuid2"],  // 個別指定時
  "send_to_all": true,                    // 全員送信時（こちらが優先）
  "email_template": "default"             // 固定
}
```

### レスポンス (200 / 207)
```json
{
  "sent_count": 48,
  "failed_count": 2,
  "total": 50,
  "failures": [
    { "participant_id": "uuid", "email": "foo@example.com", "reason": "..." }
  ]
}
```

## 実装設計

### 1. サブモジュール更新 & コード生成

1. `server` サブモジュールを `origin/main` にpull（コミット `f15dc24`）
2. `npm run generate` を実行 → `src/lib/generated/qrcode/` が生成される

### 2. カスタムフック

**新規ファイル: `src/hooks/use-qrcodes.ts`**

- `useSendQRCodes(eventId: string)` を export
- 生成された `sendEventQRCodes` をラップ
- `email_template: 'default'` を固定で付与
- 引数: `{ send_to_all: true } | { participant_ids: string[] }`

### 3. テーブルのチェックボックス

**変更ファイル: `src/components/participants/participant-table.tsx`**

- テーブル先頭列にチェックボックスを追加
- ヘッダーに全選択/全解除チェックボックス
- `selectedIds: Set<string>` を親から受け取り、`onSelectionChange` で通知
- 状態は `participants/page.tsx` 側で管理

### 4. 一括送信ダイアログ

**新規ファイル: `src/components/participants/send-qrcodes-dialog.tsx`**

- shadcn/ui の `AlertDialog` を使用
- props:
  - `eventId: string`
  - `selectedIds: Set<string>` — 空の場合は `send_to_all: true`、ある場合は `participant_ids` に変換
  - `totalCount: number` — 全参加者数（ラベル表示用）
  - `open: boolean` / `onOpenChange`
- 確認メッセージ: 「〇名にQRコードをメール送信します。よろしいですか？」
- 送信中はボタンをローディング状態に
- 結果toast:
  - 全成功: `「N名にQRコードを送信しました」`
  - 一部失敗: `「N名に送信しました（M名失敗）」`（失敗者のメール一覧も表示）

### 5. ツールバーへのボタン追加

**変更ファイル: `src/app/(admin)/events/[id]/participants/page.tsx`**

- `selectedIds` state を追加 (`Set<string>`)
- `SendQRCodesDialog` を追加
- ツールバーに `Mail` アイコン付きボタンを追加:
  - 未選択時: `QRコード送信 (全N名)`
  - 選択時: `QRコード送信 (選択N名)`
- ボタンクリックでダイアログ open

### 6. 行ごとの個別送信

**変更ファイル: `src/components/participants/participant-table.tsx`**

- 行アクションに `Mail` アイコンボタン追加（`variant="ghost" size="icon"`）
- クリックで `SendQRCodesDialog` を表示
  - `selectedIds` に対象参加者の ID 1件を渡す
  - 確認メッセージ: 「〇〇 (email) にQRコードを送信しますか？」

## ファイル変更一覧

| ファイル | 種別 |
|---|---|
| `server` (submodule) | pull |
| `src/hooks/use-qrcodes.ts` | 新規 |
| `src/components/participants/send-qrcodes-dialog.tsx` | 新規 |
| `src/components/participants/participant-table.tsx` | 変更 |
| `src/app/(admin)/events/[id]/participants/page.tsx` | 変更 |
