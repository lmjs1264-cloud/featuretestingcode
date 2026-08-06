export interface Player {
  id: string;
  name: string;
  number: string;
  position?: string;
  notes?: string;
  createdAt: number;
}

export interface Game {
  id: string;
  title: string;
  yourTeamName: string;
  opponent?: string;
  date: string;
  createdAt: number;
}

export interface FrameCapture {
  dataUrl: string;
  timeLabel: string;
}

export interface KeyMoment {
  description: string;
  timeLabel?: string;
}

export interface FocusAreaFinding {
  focusArea: string;
  observations: string[];
  recommendations: string[];
}

export interface PlayerGameStats {
  passingTDs: number;
  passingYards: number;
  passingCompletionPercent: number;
  receptions: number;
  receivingYards: number;
  receivingTDs: number;
  rushingYards: number;
  rushingTDs: number;
  rushingAttempts: number;
  sacks: number;
  tackles: number;
  interceptions: number;
  passBreakups: number;
  punts: number;
  puntYards: number;
}

export const EMPTY_PLAYER_STATS: PlayerGameStats = {
  passingTDs: 0,
  passingYards: 0,
  passingCompletionPercent: 0,
  receptions: 0,
  receivingYards: 0,
  receivingTDs: 0,
  rushingYards: 0,
  rushingTDs: 0,
  rushingAttempts: 0,
  sacks: 0,
  tackles: 0,
  interceptions: 0,
  passBreakups: 0,
  punts: 0,
  puntYards: 0,
};

export interface PlayerNote {
  jerseyNumber?: string;
  playerName?: string;
  playerId?: string;
  observations: string[];
  recommendations: string[];
  grade?: string;
  stats: PlayerGameStats;
}

export interface TeamPassingStats {
  shortPassPercent: number;
  mediumPassPercent: number;
  deepPassPercent: number;
  completionPercent: number;
  yardsPerShortPass: number;
  yardsPerMediumPass: number;
  yardsPerDeepPass: number;
}

export interface TeamPlayDirectionStats {
  leftPercent: number;
  middlePercent: number;
  rightPercent: number;
}

export interface TeamDefenseStats {
  blitzPercent: number;
}

export interface TeamStats {
  passing: TeamPassingStats;
  playDirection: TeamPlayDirectionStats;
  defense: TeamDefenseStats;
  methodologyNote: string;
}

export interface BothTeamsStats {
  yourTeam: TeamStats;
  opponent: TeamStats;
}

export interface AnalysisResult {
  teamSummary: {
    strengths: string[];
    weaknesses: string[];
    keyMoments: KeyMoment[];
  };
  teamStats: BothTeamsStats;
  focusAreaFindings: FocusAreaFinding[];
  playerNotes: PlayerNote[];
  nextPracticeFocus: string[];
}

export interface StatThresholds {
  shortMaxYards: number;
  mediumMaxYards: number;
}

export const DEFAULT_STAT_THRESHOLDS: StatThresholds = {
  shortMaxYards: 9,
  mediumMaxYards: 19,
};

export interface Analysis {
  id: string;
  gameId: string;
  title: string;
  focusAreas: string[];
  customFocusNotes?: string;
  statThresholds: StatThresholds;
  model: string;
  createdAt: number;
  frames: FrameCapture[];
  result: AnalysisResult;
}

export const DEFAULT_FOCUS_AREAS = [
  'Run blocking',
  'Pass protection',
  'Route running & separation',
  'Flag-pulling technique',
  'QB decision-making',
  'Defensive coverage',
  'Rush lane discipline',
  'Special teams / snap-to-play speed',
  'Penalties & discipline',
  'Play calling & formations',
] as const;
