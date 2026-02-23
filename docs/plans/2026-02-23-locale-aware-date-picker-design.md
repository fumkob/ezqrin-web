# ロケール対応日付ピッカー設計書

**日付**: 2026-02-23
**対象**: イベント作成・編集フォームの日付入力
**目的**: ブラウザのロケール設定に応じて日付フォーマットが自動適応する UI の実装

---

## 背景・課題

現在の `event-form.tsx` は `type="datetime-local"` のネイティブ HTML 入力を使用している。
このフォーマットはブラウザ/OS のロケール設定に依存するため、ユーロッパ系ロケールでは
DD/MM/YYYY 形式が表示され、地域によって使いづらい状態になっている。

---

## 設計方針

ブラウザの `navigator.language` を読み取り、各ロケールに適した日付フォーマットで
表示するカスタム `DateTimePicker` コンポーネントを実装する。

---

## アーキテクチャ

### 変更ファイル

| ファイル | 変更種別 |
|---------|---------|
| `src/components/ui/date-time-picker.tsx` | **新規作成** |
| `src/components/events/event-form.tsx` | **修正** |

### 追加 shadcn コンポーネント

```bash
npx shadcn@latest add calendar popover
```

---

## DateTimePicker コンポーネント仕様

### Props

```ts
interface DateTimePickerProps {
  id?: string
  value?: string        // ISO形式文字列 "2026-03-15T14:30"
  onChange: (value: string) => void
  placeholder?: string
}
```

### 内部状態

- `open: boolean` — Popover の開閉状態
- `date: Date | undefined` — 選択中の日付
- `time: string` — "HH:MM" 形式の時刻文字列

### ロケール検出ロジック

`navigator.language` を取得し、date-fns のロケールにマッピングする:

| navigator.language | date-fns ロケール | 表示フォーマット |
|-------------------|-----------------|----------------|
| `ja`, `ja-JP` | `ja` | `yyyy年MM月dd日 HH:mm` |
| `en-US` | `enUS` | `MM/dd/yyyy HH:mm` |
| `en-GB` | `enGB` | `dd/MM/yyyy HH:mm` |
| `fr`, `fr-*` | `fr` | `dd/MM/yyyy HH:mm` |
| `de`, `de-*` | `de` | `dd.MM.yyyy HH:mm` |
| `it`, `it-*` | `it` | `dd/MM/yyyy HH:mm` |
| `zh`, `zh-*` | `zhCN` | `yyyy年MM月dd日 HH:mm` |
| `ko`, `ko-KR` | `ko` | `yyyy년 MM월 dd일 HH:mm` |
| その他 | `enUS` (フォールバック) | `MM/dd/yyyy HH:mm` |

### UI 構造

```
[ボタン]                              ← ロケール形式でフォーマットした日時を表示
  ↓ クリック
[Popover]
  ├── [Calendar]                       ← shadcn Calendar で日付選択
  └── [時刻入力]                       ← type="time" または HH:MM テキスト入力
```

### 値の管理

- 表示: date-fns `format()` でロケール形式にフォーマット
- 内部 / フォーム送信: `YYYY-MM-DDTHH:MM` の ISO 形式文字列
- RFC3339 変換: 既存の `toRFC3339()` 関数をそのまま使用

---

## event-form.tsx の変更内容

### Before

```tsx
<Input id="start_date" type="datetime-local" {...register('start_date')} />
<Input id="end_date" type="datetime-local" {...register('end_date')} />
```

### After

```tsx
<DateTimePicker
  id="start_date"
  value={watch('start_date')}
  onChange={(v) => setValue('start_date', v, { shouldValidate: true })}
/>
<DateTimePicker
  id="end_date"
  value={watch('end_date')}
  onChange={(v) => setValue('end_date', v, { shouldValidate: true })}
/>
```

---

## 考慮事項

- **SSR 対応**: `navigator.language` はクライアントサイドのみで利用可能。
  `use client` コンポーネントとして実装し、SSR 時は `enUS` をフォールバックとして使用。
- **既存の toRFC3339 変換**: フォームデータの変換ロジックは変更不要。
- **バリデーション**: 既存の zod スキーマ（`z.string().min(1, '必須')`）をそのまま使用可能。
