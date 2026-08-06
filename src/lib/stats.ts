import { EMPTY_PLAYER_STATS, type PlayerGameStats } from '../types';

export const STAT_FIELDS: { key: keyof PlayerGameStats; label: string; isPercent?: boolean }[] = [
  { key: 'passingCompletionPercent', label: 'Comp %', isPercent: true },
  { key: 'passingYards', label: 'Pass Yds' },
  { key: 'passingTDs', label: 'Pass TD' },
  { key: 'rushingAttempts', label: 'Rush Att' },
  { key: 'rushingYards', label: 'Rush Yds' },
  { key: 'rushingTDs', label: 'Rush TD' },
  { key: 'receptions', label: 'Rec' },
  { key: 'receivingYards', label: 'Rec Yds' },
  { key: 'receivingTDs', label: 'Rec TD' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'sacks', label: 'Sacks' },
  { key: 'interceptions', label: 'INT' },
  { key: 'passBreakups', label: 'PBU' },
  { key: 'punts', label: 'Punts' },
  { key: 'puntYards', label: 'Punt Yds' },
];

export function nonZeroStats(stats: PlayerGameStats | undefined) {
  if (!stats) return [];
  return STAT_FIELDS.filter(({ key }) => stats[key] !== 0 && stats[key] != null).map(({ key, label, isPercent }) => ({
    label,
    value: isPercent ? `${stats[key]}%` : stats[key],
  }));
}

export function sumStats(list: PlayerGameStats[]): PlayerGameStats {
  const total = { ...EMPTY_PLAYER_STATS };
  let completionSamples = 0;
  let completionTotal = 0;
  for (const s of list) {
    for (const key of Object.keys(total) as (keyof PlayerGameStats)[]) {
      if (key === 'passingCompletionPercent') continue;
      total[key] += s[key] ?? 0;
    }
    if (s.passingCompletionPercent) {
      completionTotal += s.passingCompletionPercent;
      completionSamples += 1;
    }
  }
  total.passingCompletionPercent = completionSamples
    ? Math.round(completionTotal / completionSamples)
    : 0;
  return total;
}
