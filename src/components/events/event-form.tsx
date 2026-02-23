'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import type { CreateEventRequest, Event } from '@/types/api';

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
      start_date: defaultValues?.start_date?.slice(0, 16) ?? '',
      end_date: defaultValues?.end_date?.slice(0, 16) ?? '',
      location: defaultValues?.location ?? '',
      timezone: defaultValues?.timezone ?? 'Asia/Tokyo',
      status: (defaultValues?.status ?? 'draft') as FormData['status'],
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data as CreateEventRequest))}
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

      <div className="space-y-2">
        <Label htmlFor="location">会場</Label>
        <Input id="location" {...register('location')} />
      </div>

      <div className="space-y-2">
        <Label>ステータス</Label>
        <Select
          defaultValue={watch('status') as string}
          onValueChange={(v) => setValue('status', v as FormData['status'])}
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

      <Button type="submit" disabled={isLoading}>
        {isLoading ? '保存中...' : '保存'}
      </Button>
    </form>
  );
}
