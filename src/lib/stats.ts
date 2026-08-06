import { EMPTY_PLAYER_STATS, type Analysis, type BothTeamsStats, type FormationTendency, type PlayerGameStats, type TeamStats } from '../types';

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

function weightedAvg(pairs: { value: number; weight: number }[]): number {
  const totalWeight = pairs.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return 0;
  const sum = pairs.reduce((s, p) => s + p.value * p.weight, 0);
  return Math.round((sum / totalWeight) * 10) / 10;
}

function mergeFormationTendencies(lists: FormationTendency[][]): FormationTendency[] {
  const byKey = new Map<string, { formation: string; playsObserved: number; manSum: number; blitzSum: number }>();
  for (const list of lists) {
    for (const f of list ?? []) {
      const key = f.formation.trim().toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.playsObserved += f.playsObserved;
        existing.manSum += f.manCoveragePercent * f.playsObserved;
        existing.blitzSum += f.blitzPercent * f.playsObserved;
      } else {
        byKey.set(key, {
          formation: f.formation,
          playsObserved: f.playsObserved,
          manSum: f.manCoveragePercent * f.playsObserved,
          blitzSum: f.blitzPercent * f.playsObserved,
        });
      }
    }
  }
  return Array.from(byKey.values())
    .map((v) => ({
      formation: v.formation,
      playsObserved: v.playsObserved,
      manCoveragePercent: v.playsObserved ? Math.round(v.manSum / v.playsObserved) : 0,
      blitzPercent: v.playsObserved ? Math.round(v.blitzSum / v.playsObserved) : 0,
    }))
    .sort((a, b) => b.playsObserved - a.playsObserved);
}

function rollupSingleTeam(entries: { stats: TeamStats; weight: number }[], analysisCount: number): TeamStats {
  const w = (pick: (s: TeamStats) => number) => entries.map((e) => ({ value: pick(e.stats), weight: e.weight }));
  return {
    passing: {
      shortPassPercent: weightedAvg(w((s) => s.passing.shortPassPercent)),
      mediumPassPercent: weightedAvg(w((s) => s.passing.mediumPassPercent)),
      deepPassPercent: weightedAvg(w((s) => s.passing.deepPassPercent)),
      completionPercent: weightedAvg(w((s) => s.passing.completionPercent)),
      yardsPerShortPass: weightedAvg(w((s) => s.passing.yardsPerShortPass)),
      yardsPerMediumPass: weightedAvg(w((s) => s.passing.yardsPerMediumPass)),
      yardsPerDeepPass: weightedAvg(w((s) => s.passing.yardsPerDeepPass)),
    },
    playDirection: {
      leftPercent: weightedAvg(w((s) => s.playDirection.leftPercent)),
      middlePercent: weightedAvg(w((s) => s.playDirection.middlePercent)),
      rightPercent: weightedAvg(w((s) => s.playDirection.rightPercent)),
    },
    defense: {
      blitzPercent: weightedAvg(w((s) => s.defense.blitzPercent)),
      formationTendencies: mergeFormationTendencies(entries.map((e) => e.stats.defense.formationTendencies)),
    },
    methodologyNote: `Combined across ${analysisCount} analys${analysisCount === 1 ? 'is' : 'es'} for this game, weighted by frames sampled in each. Percentages are a weighted average, not a re-derivation from raw plays — see individual analyses for per-segment detail and confidence.`,
  };
}

export function rollupTeamStats(analyses: Analysis[]): BothTeamsStats | null {
  const withStats = analyses.filter((a) => a.result?.teamStats);
  if (withStats.length === 0) return null;
  const entries = withStats.map((a) => ({ analysis: a, weight: Math.max(a.frames.length, 1) }));
  return {
    yourTeam: rollupSingleTeam(
      entries.map((e) => ({ stats: e.analysis.result.teamStats.yourTeam, weight: e.weight })),
      withStats.length,
    ),
    opponent: rollupSingleTeam(
      entries.map((e) => ({ stats: e.analysis.result.teamStats.opponent, weight: e.weight })),
      withStats.length,
    ),
  };
}
