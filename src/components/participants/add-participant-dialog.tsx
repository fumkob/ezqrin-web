'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import type { CreateParticipantRequest } from '@/lib/generated/model';

const schema = z.object({
  name: z.string().min(1, '必須'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  employee_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddParticipantDialogProps {
  onAdd: (data: CreateParticipantRequest) => Promise<void>;
}

export function AddParticipantDialog({ onAdd }: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      await onAdd(data);
      reset();
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />参加者を追加
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>参加者を追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>名前 *</Label>
            <Input {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>メールアドレス *</Label>
            <Input type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>社員ID</Label>
            <Input {...register('employee_id')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '追加中...' : '追加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
