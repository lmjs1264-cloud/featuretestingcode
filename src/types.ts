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

export interface PlayerNote {
  jerseyNumber?: string;
  playerName?: string;
  playerId?: string;
  observations: string[];
  recommendations: string[];
  grade?: string;
}

export interface AnalysisResult {
  teamSummary: {
    strengths: string[];
    weaknesses: string[];
    keyMoments: KeyMoment[];
  };
  focusAreaFindings: FocusAreaFinding[];
  playerNotes: PlayerNote[];
  nextPracticeFocus: string[];
}

export interface Analysis {
  id: string;
  gameId: string;
  title: string;
  focusAreas: string[];
  customFocusNotes?: string;
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
