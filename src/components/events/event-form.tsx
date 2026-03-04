'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import type { CreateEventRequest, Event } from '@/lib/generated/model';

const schema = z.object({
  name: z.string().min(1, '必須').max(255),
  description: z.string().max(5000).optional(),
  start_date: z.string().min(1, '必須'),
  end_date: z.string().optional(),
  location: z.string().max(500).optional(),
  timezone: z.string(),
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']),
});

type FormData = z.infer<typeof schema>;

interface EventFormProps {
  defaultValues?: Partial<Event>;
  onSubmit: (data: CreateEventRequest) => Promise<void>;
  isLoading: boolean;
}

export function EventForm({ defaultValues, onSubmit, isLoading }: EventFormProps) {
  const tz = defaultValues?.timezone ?? 'Asia/Tokyo';

  function toDatetimeLocal(iso: string | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      start_date: toDatetimeLocal(defaultValues?.start_date),
      end_date: toDatetimeLocal(defaultValues?.end_date),
      location: defaultValues?.location ?? '',
      timezone: tz,
      status: (defaultValues?.status ?? 'draft') as FormData['status'],
    },
  });

  function onInvalid() {
    toast.error('入力内容を確認してください');
  }

  function toRFC3339(datetimeLocal: string, timezone: string): string {
    const date = new Date(datetimeLocal);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    });
    const offsetPart = formatter.formatToParts(date).find((p) => p.type === 'timeZoneName');
    const offset = offsetPart ? offsetPart.value.replace('GMT', '') : '+00:00';
    return `${datetimeLocal}:00${offset}`;
  }

  return (
    <form
      onSubmit={handleSubmit((data) => {
        const converted: CreateEventRequest = {
          ...data,
          start_date: toRFC3339(data.start_date, data.timezone),
          end_date: data.end_date ? toRFC3339(data.end_date, data.timezone) : undefined,
        } as CreateEventRequest;
        return onSubmit(converted);
      }, onInvalid)}
      className="space-y-4 max-w-lg"
    >
      <div className="space-y-2">
        <Label htmlFor="name">イベント名 *</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea id="description" {...register('description')} rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">開始日時 *</Label>
          <DateTimePicker
            id="start_date"
            value={watch('start_date') || undefined}
            onChange={(v) => setValue('start_date', v, { shouldValidate: true })}
            maxDate={watch('end_date') ? new Date(watch('end_date')!) : undefined}
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
            minDate={watch('start_date') ? new Date(watch('start_date')) : undefined}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">会場</Label>
        <Input id="location" {...register('location')} />
      </div>

      <div className="space-y-2">
        <Label>ステータス</Label>
        <input type="hidden" {...register('status')} />
        <Select
          value={watch('status')}
          onValueChange={(v) => setValue('status', v as FormData['status'], { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="published">公開</SelectItem>
            <SelectItem value="ongoing">開催中</SelectItem>
            <SelectItem value="completed">終了</SelectItem>
            <SelectItem value="cancelled">キャンセル</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <input type="hidden" {...register('timezone')} />

      <Button type="submit" disabled={isLoading}>
        {isLoading ? '保存中...' : '保存'}
      </Button>
    </form>
  );
}
