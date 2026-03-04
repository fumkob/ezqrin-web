import { de, enGB, enUS, fr, it, ja, ko, zhCN } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export function getDateLocale(lang: string): Locale {
  const base = lang.toLowerCase();
  if (base.startsWith('ja')) return ja;
  if (base.startsWith('zh')) return zhCN;
  if (base.startsWith('ko')) return ko;
  if (base === 'en-us') return enUS;
  if (base.startsWith('fr')) return fr;
  if (base.startsWith('de')) return de;
  if (base.startsWith('it')) return it;
  if (base.startsWith('en')) return enGB;
  return enUS;
}
