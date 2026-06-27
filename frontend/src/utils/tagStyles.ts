const TAG_STYLES: Record<string, string> = {
  TP: 'bg-emerald-600 text-white',
  SL: 'bg-rose-600 text-white',
  BE: 'bg-zinc-950 text-white dark:bg-black',
  LONG: 'bg-zinc-300 text-emerald-600 dark:bg-zinc-600 dark:text-emerald-400',
  SHORT: 'bg-zinc-300 text-rose-600 dark:bg-zinc-600 dark:text-rose-400',
  'BIAS-BULL': 'bg-zinc-300 text-emerald-600 dark:bg-zinc-600 dark:text-emerald-400',
  'BIAS-BEAR': 'bg-zinc-300 text-rose-600 dark:bg-zinc-600 dark:text-rose-400',
  'D-BIAS-BULL': 'bg-zinc-300 text-emerald-600 dark:bg-zinc-600 dark:text-emerald-400',
  'D-BIAS-BEAR': 'bg-zinc-300 text-rose-600 dark:bg-zinc-600 dark:text-rose-400',
  'W-BIAS-BULL': 'bg-zinc-300 text-emerald-600 dark:bg-zinc-600 dark:text-emerald-400',
  'W-BIAS-BEAR': 'bg-zinc-300 text-rose-600 dark:bg-zinc-600 dark:text-rose-400',
  'W,D-BIAS-BULL': 'bg-zinc-300 text-emerald-600 dark:bg-zinc-600 dark:text-emerald-400',
  'W,D-BIAS-BEAR': 'bg-zinc-300 text-rose-600 dark:bg-zinc-600 dark:text-rose-400',
  ASIA: 'bg-zinc-300 text-cyan-700 dark:bg-zinc-600 dark:text-cyan-400',
  LO: 'bg-zinc-300 text-cyan-700 dark:bg-zinc-600 dark:text-cyan-400',
  NYA: 'bg-zinc-300 text-cyan-700 dark:bg-zinc-600 dark:text-cyan-400',
  NYL: 'bg-zinc-300 text-cyan-700 dark:bg-zinc-600 dark:text-cyan-400',
  NYP: 'bg-zinc-300 text-cyan-700 dark:bg-zinc-600 dark:text-cyan-400',
}

const DEFAULT_TAG_CLASS =
  'bg-zinc-200/80 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'

export function getTagClass(tag: string): string {
  return TAG_STYLES[tag.trim().toUpperCase()] ?? DEFAULT_TAG_CLASS
}
