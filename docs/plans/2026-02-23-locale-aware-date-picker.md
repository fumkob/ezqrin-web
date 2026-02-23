# Locale-Aware DateTimePicker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** イベントフォームの日付入力をブラウザのロケール（`navigator.language`）に応じたフォーマットで表示するカスタム `DateTimePicker` コンポーネントに置き換える。

**Architecture:** shadcn の Calendar + Popover コンポーネントを使ったカスタム DateTimePicker を作成する。`navigator.language` から date-fns ロケールにマッピングし、表示フォーマットを動的に切り替える。フォーム内部の値は引き続き ISO 形式文字列（`YYYY-MM-DDTHH:MM`）で管理し、既存の RFC3339 変換ロジックは変更しない。

**Tech Stack:** Next.js 16, React 19, shadcn (new-york style), date-fns v4, react-hook-form, Tailwind CSS v4

---

### Task 1: shadcn Calendar と Popover コンポーネントの追加

**Files:**
- Create: `src/components/ui/calendar.tsx` (shadcn が自動生成)
- Create: `src/components/ui/popover.tsx` (shadcn が自動生成)

**Step 1: shadcn コンポーネントを追加する**

`/Users/fumkob/Documents/ezqrin/ezqrin-web/main` で実行:

```bash
npx shadcn@latest add calendar popover --yes
```

**Step 2: 追加されたファイルを確認する**

```bash
ls src/components/ui/calendar.tsx src/components/ui/popover.tsx
```

期待される出力:
```
src/components/ui/calendar.tsx
src/components/ui/popover.tsx
```

**Step 3: react-day-picker がインストールされたことを確認する**

```bash
cat package.json | grep react-day-picker
```

期待される出力（バージョンは異なる可能性あり）:
```
"react-day-picker": "^9.x.x"
```

**Step 4: TypeScript エラーなしでビルドできるか確認する**

```bash
npm run build 2>&1 | tail -5
```

**Step 5: コミットする**

```bash
git add src/components/ui/calendar.tsx src/components/ui/popover.tsx package.json package-lock.json
git commit -m "feat: add shadcn Calendar and Popover components"
```

---

### Task 2: `DateTimePicker` コンポーネントの作成

**Files:**
- Create: `src/components/ui/date-time-picker.tsx`

**Step 1: ファイルを作成する**

`src/components/ui/date-time-picker.tsx` を以下の内容で作成:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { de, enGB, enUS, fr, it, ja, ko, zhCN } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface LocaleInfo {
  locale: Locale;
  formatStr: string;
}

function getLocaleInfo(lang: string): LocaleInfo {
  const base = lang.toLowerCase();
  if (base.startsWith('ja')) return { locale: ja, formatStr: 'yyyy年MM月dd日 HH:mm' };
  if (base.startsWith('zh')) return { locale: zhCN, formatStr: 'yyyy年M月d日 HH:mm' };
  if (base.startsWith('ko')) return { locale: ko, formatStr: 'yyyy년 M월 d일 HH:mm' };
  if (base === 'en-us') return { locale: enUS, formatStr: 'M/d/yyyy HH:mm' };
  if (base.startsWith('fr')) return { locale: fr, formatStr: 'dd/MM/yyyy HH:mm' };
  if (base.startsWith('de')) return { locale: de, formatStr: 'dd.MM.yyyy HH:mm' };
  if (base.startsWith('it')) return { locale: it, formatStr: 'dd/MM/yyyy HH:mm' };
  if (base.startsWith('en')) return { locale: enGB, formatStr: 'dd/MM/yyyy HH:mm' };
  return { locale: enUS, formatStr: 'M/d/yyyy HH:mm' };
}

interface DateTimePickerProps {
  id?: string;
  value?: string; // "YYYY-MM-DDTHH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateTimePicker({ id, value, onChange, placeholder }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined,
  );
  const [time, setTime] = useState<string>(value ? value.slice(11, 16) : '00:00');
  const [localeInfo, setLocaleInfo] = useState<LocaleInfo>(() => getLocaleInfo('en-US'));

  useEffect(() => {
    setLocaleInfo(getLocaleInfo(navigator.language));
  }, []);

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
      setTime(value.slice(11, 16));
    } else {
      setSelectedDate(undefined);
      setTime('00:00');
    }
  }, [value]);

  function buildIso(date: Date, hhmm: string): string {
    return `${format(date, 'yyyy-MM-dd')}T${hhmm}`;
  }

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    if (date) {
      onChange(buildIso(date, time));
    }
  }

  function handleTimeChange(newTime: string) {
    setTime(newTime);
    if (selectedDate) {
      onChange(buildIso(selectedDate, newTime));
    }
  }

  function getDisplayValue(): string | undefined {
    if (!selectedDate) return undefined;
    const d = new Date(selectedDate);
    const [hh, mm] = time.split(':').map(Number);
    d.setHours(hh, mm, 0, 0);
    return format(d, localeInfo.formatStr, { locale: localeInfo.locale });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayValue() ?? (placeholder ?? '日時を選択')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={localeInfo.locale}
          autoFocus
        />
        <div className="border-t p-3">
          <input
            type="time"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Step 2: TypeScript の型エラーがないか確認する**

```bash
npx tsc --noEmit 2>&1 | grep "date-time-picker"
```

期待される出力: (エラーなし・出力なし)

**Step 3: コミットする**

```bash
git add src/components/ui/date-time-picker.tsx
git commit -m "feat: add locale-aware DateTimePicker component"
```

---

### Task 3: `event-form.tsx` を DateTimePicker に切り替える

**Files:**
- Modify: `src/components/events/event-form.tsx`

**Step 1: event-form.tsx を修正する**

`src/components/events/event-form.tsx` の先頭 import に追加:

```tsx
import { DateTimePicker } from '@/components/ui/date-time-picker';
```

**Step 2: `start_date` と `end_date` の Input を DateTimePicker に置き換える**

変更前:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="start_date">開始日時 *</Label>
    <Input id="start_date" type="datetime-local" {...register('start_date')} />
    {errors.start_date && (
      <p className="text-sm text-destructive">{errors.start_date.message as string}</p>
    )}
  </div>
  <div className="space-y-2">
    <Label htmlFor="end_date">終了日時</Label>
    <Input id="end_date" type="datetime-local" {...register('end_date')} />
  </div>
</div>
```

変更後:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="start_date">開始日時 *</Label>
    <DateTimePicker
      id="start_date"
      value={watch('start_date') || undefined}
      onChange={(v) => setValue('start_date', v, { shouldValidate: true })}
    />
    {errors.start_date && (
      <p className="text-sm text-destructive">{errors.start_date.message as string}</p>
    )}
  </div>
  <div className="space-y-2">
    <Label htmlFor="end_date">終了日時</Label>
    <DateTimePicker
      id="end_date"
      value={watch('end_date') || undefined}
      onChange={(v) => setValue('end_date', v, { shouldValidate: true })}
    />
  </div>
</div>
```

**Step 3: `register('start_date')` と `register('end_date')` の呼び出しが残っていないか確認する**

```bash
grep "datetime-local" src/components/events/event-form.tsx
```

期待される出力: (出力なし)

**Step 4: ビルドエラーがないか確認する**

```bash
npm run build 2>&1 | tail -10
```

期待される出力:
```
✓ Compiled successfully
```

**Step 5: コミットする**

```bash
git add src/components/events/event-form.tsx
git commit -m "feat: replace datetime-local inputs with locale-aware DateTimePicker"
```

---

### Task 4: 動作確認

**Step 1: 開発サーバーを起動する**

```bash
npm run dev
```

**Step 2: ブラウザで動作確認する**

`http://localhost:9000/events/new` にアクセスし、以下を確認:

1. **開始日時** フィールドがカレンダーボタンになっている
2. ボタンをクリックするとカレンダーポップオーバーが開く
3. 日付を選択すると、ボタンのラベルがロケール形式で更新される
4. 時刻入力で時刻を変更すると表示も更新される
5. フォームを送信してイベントが作成できる

**Step 3: ロケールの動作確認**

ブラウザの言語設定を変更して（Chrome: 設定 → 言語）、以下のフォーマットを確認:

| ブラウザ言語 | 期待される表示例 |
|------------|----------------|
| 日本語 (ja) | `2026年3月15日 14:30` |
| 英語 (US) | `3/15/2026 14:30` |
| 英語 (UK) | `15/03/2026 14:30` |
| フランス語 | `15/03/2026 14:30` |

**Step 4: 編集フォームでも確認する**

既存イベントの `/events/[id]/edit` を開き、既存の日時が正しくロケール形式で表示されることを確認する。
