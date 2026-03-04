'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { Locale } from 'date-fns';
import { getDateLocale } from '@/lib/locale';

export function useDateLocale(): Locale {
  const lang = useSyncExternalStore(
    () => () => {},
    () => navigator.language,
    () => 'en-US',
  );
  return useMemo(() => getDateLocale(lang), [lang]);
}
