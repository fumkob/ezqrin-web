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
