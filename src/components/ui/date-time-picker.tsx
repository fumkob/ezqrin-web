'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDateLocale } from '@/hooks/use-locale';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface DateTimePickerProps {
  id?: string;
  value?: string; // "YYYY-MM-DDTHH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // value から直接導出（内部 state 不要）
  const selectedDate = value ? new Date(value) : undefined;
  const time = value ? value.slice(11, 16) : '00:00';
  const [hour, minute] = time.split(':');

  const locale = useDateLocale();

  const disabledDates = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  function buildIso(date: Date, hhmm: string): string {
    return `${format(date, 'yyyy-MM-dd')}T${hhmm}`;
  }

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      onChange(buildIso(date, time));
    }
  }

  function handleHourChange(newHour: string) {
    if (selectedDate) {
      onChange(buildIso(selectedDate, `${newHour}:${minute}`));
    }
  }

  function handleMinuteChange(newMinute: string) {
    if (selectedDate) {
      onChange(buildIso(selectedDate, `${hour}:${newMinute}`));
    }
  }

  function getDisplayValue(): string | undefined {
    if (!selectedDate) return undefined;
    const d = new Date(selectedDate);
    const [hh, mm] = time.split(':').map(Number);
    d.setHours(hh, mm, 0, 0);
    return format(d, 'PPp', { locale });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal bg-transparent',
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
          locale={locale}
          disabled={disabledDates.length > 0 ? disabledDates : undefined}
          autoFocus
        />
        <div className="flex items-center gap-2 border-t px-3 py-2">
          <span className="text-sm text-muted-foreground">時刻</span>
          <select
            value={hour}
            onChange={(e) => handleHourChange(e.target.value)}
            disabled={!selectedDate}
            className="rounded border px-1 py-1 text-sm disabled:opacity-50"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-sm font-medium">:</span>
          <select
            value={minute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            disabled={!selectedDate}
            className="rounded border px-1 py-1 text-sm disabled:opacity-50"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
