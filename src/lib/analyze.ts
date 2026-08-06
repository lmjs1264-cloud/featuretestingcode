import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult, FrameCapture, Player, StatThresholds } from '../types';

const playerStatsSchema = {
  type: 'object',
  description:
    'Per-player statistical counts observed in the film. Use 0 for any stat category that does not apply to this player or that you did not observe — never omit fields.',
  properties: {
    passingTDs: { type: 'integer' },
    passingYards: { type: 'integer' },
    passingCompletionPercent: { type: 'number' },
    receptions: { type: 'integer' },
    receivingYards: { type: 'integer' },
    receivingTDs: { type: 'integer' },
    rushingYards: { type: 'integer' },
    rushingTDs: { type: 'integer' },
    rushingAttempts: { type: 'integer' },
    sacks: { type: 'integer', description: 'Times this player sacked/flag-pulled the QB behind the line of scrimmage.' },
    tackles: { type: 'integer', description: 'Flag pulls made on the ball carrier.' },
    interceptions: { type: 'integer' },
    passBreakups: { type: 'integer' },
    punts: { type: 'integer' },
    puntYards: { type: 'integer' },
  },
  required: [
    'passingTDs',
    'passingYards',
    'passingCompletionPercent',
    'receptions',
    'receivingYards',
    'receivingTDs',
    'rushingYards',
    'rushingTDs',
    'rushingAttempts',
    'sacks',
    'tackles',
    'interceptions',
    'passBreakups',
    'punts',
    'puntYards',
  ],
};

const ANALYSIS_TOOL = {
  name: 'submit_film_analysis',
  description:
    'Submit structured coaching feedback and statistics for a flag football team based on the reviewed film frames.',
  input_schema: {
    type: 'object' as const,
    properties: {
      teamSummary: {
        type: 'object',
        properties: {
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
          keyMoments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                timeLabel: { type: 'string' },
              },
              required: ['description'],
            },
          },
        },
        required: ['strengths', 'weaknesses', 'keyMoments'],
      },
      teamStats: {
        type: 'object',
        description: 'Team-level statistical breakdown estimated from the sampled frames.',
        properties: {
          passing: {
            type: 'object',
            properties: {
              shortPassPercent: { type: 'number', description: '% of pass attempts that were short.' },
              mediumPassPercent: { type: 'number', description: '% of pass attempts that were medium.' },
              deepPassPercent: { type: 'number', description: '% of pass attempts that were deep.' },
              completionPercent: { type: 'number', description: 'Overall pass completion % across all depths.' },
              yardsPerShortPass: { type: 'number', description: 'Average yards gained per short pass attempt.' },
              yardsPerMediumPass: { type: 'number', description: 'Average yards gained per medium pass attempt.' },
              yardsPerDeepPass: { type: 'number', description: 'Average yards gained per deep pass attempt.' },
            },
            required: [
              'shortPassPercent',
              'mediumPassPercent',
              'deepPassPercent',
              'completionPercent',
              'yardsPerShortPass',
              'yardsPerMediumPass',
              'yardsPerDeepPass',
            ],
          },
          playDirection: {
            type: 'object',
            properties: {
              leftPercent: { type: 'number', description: '% of offensive plays run to the offense\'s left.' },
              middlePercent: { type: 'number', description: '% of offensive plays run up the middle.' },
              rightPercent: { type: 'number', description: '% of offensive plays run to the offense\'s right.' },
            },
            required: ['leftPercent', 'middlePercent', 'rightPercent'],
          },
          defense: {
            type: 'object',
            properties: {
              blitzPercent: {
                type: 'number',
                description: '% of defensive plays where 3 or more defenders rushed the QB.',
              },
            },
            required: ['blitzPercent'],
          },
          methodologyNote: {
            type: 'string',
            description:
              'One or two sentences on how confident these stats are given the number/spacing of sampled frames, and roughly how many distinct plays you could actually observe.',
          },
        },
        required: ['passing', 'playDirection', 'defense', 'methodologyNote'],
      },
      focusAreaFindings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            focusArea: { type: 'string' },
            observations: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
          required: ['focusArea', 'observations', 'recommendations'],
        },
      },
      playerNotes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            jerseyNumber: { type: 'string' },
            playerName: { type: 'string' },
            observations: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            grade: { type: 'string', description: 'Optional short grade like A-/B+/C, or omit.' },
            stats: playerStatsSchema,
          },
          required: ['observations', 'recommendations', 'stats'],
        },
      },
      nextPracticeFocus: {
        type: 'array',
        items: { type: 'string' },
        description: '3-5 concrete, prioritized things to drill at the next practice.',
      },
    },
    required: ['teamSummary', 'teamStats', 'focusAreaFindings', 'playerNotes', 'nextPracticeFocus'],
  },
};

export interface AnalyzeParams {
  apiKey: string;
  model: string;
  frames: FrameCapture[];
  roster: Player[];
  focusAreas: string[];
  customFocusNotes?: string;
  gameContext?: string;
  statThresholds: StatThresholds;
}

function buildSystemPrompt(thresholds: StatThresholds): string {
  return `You are an experienced flag football coach and film analyst helping a youth/adult flag football team improve. You are shown a sequence of still frames sampled from a single game's video, in chronological order with timestamps.

Field & stat calibration:
- This is flag football on a 60-yard field (NOT a 100-yard field) — calibrate all yardage and distance estimates accordingly.
- Classify each pass attempt by depth of target past the line of scrimmage: short = 0-${thresholds.shortMaxYards} yards, medium = ${thresholds.shortMaxYards + 1}-${thresholds.mediumMaxYards} yards, deep = ${thresholds.mediumMaxYards + 1}+ yards.
- A "blitz" means 3 or more defenders rushing the QB on a given play.
- Sacks and tackles in this context mean the flag-pull equivalent (pulling the QB behind the line of scrimmage counts as a sack; pulling the ball carrier's flag counts as a tackle).

Ground rules:
- Only report what you can actually observe in the frames. Do not invent stats, scores, or events you cannot see. All statistics — team and individual — are necessarily estimates derived from a limited number of sampled still frames, not a full play-by-play record. Be honest about this in the methodologyNote field, and lean conservative rather than inventing precise-looking numbers you can't support.
- Identify players by jersey number when it is legibly visible in a frame. If you cannot confidently read a jersey number, describe the player by position/role/location on the field instead of guessing an identity.
- Cross-reference legible jersey numbers against the provided roster to use player names when possible, but never assert a name you aren't reasonably confident in from a visible number.
- For every player you create a playerNotes entry for, fill in the stats object using only what you actually witnessed in the sampled frames; use 0 for categories you didn't observe for that player rather than omitting them.
- Be specific and actionable. Prefer concrete coaching cues ("get hands up earlier on the rush") over vague praise/criticism.
- Weigh the user's requested focus areas most heavily, but still flag anything else important you notice (safety, effort, discipline).
- Keep tone constructive and encouraging, appropriate for feedback that will be shared with players and parents.
- You must respond only by calling the submit_film_analysis tool.`;
}

function buildUserText(params: AnalyzeParams): string {
  const rosterText = params.roster.length
    ? params.roster
        .map((p) => `#${p.number} ${p.name}${p.position ? ` (${p.position})` : ''}`)
        .join('\n')
    : '(No roster provided — reference players by jersey number or field position only.)';

  const focusText = params.focusAreas.length
    ? params.focusAreas.map((f) => `- ${f}`).join('\n')
    : '(No specific focus areas selected — give a well-rounded general review.)';

  return `Game context: ${params.gameContext || 'N/A'}

Team roster (jersey # / name / position):
${rosterText}

Requested focus areas for this review:
${focusText}
${params.customFocusNotes ? `\nAdditional notes from the coach: ${params.customFocusNotes}` : ''}

Below are ${params.frames.length} frames sampled chronologically from the game film, each labeled with its timestamp. Review them as a sequence and produce your analysis by calling submit_film_analysis. Cover team-level strengths/weaknesses, team-level passing/direction/blitz statistics, findings for each requested focus area, individual player notes and stat lines for anyone identifiable, and a prioritized list of next-practice focus items.`;
}

export async function analyzeFilm(params: AnalyzeParams): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey: params.apiKey, dangerouslyAllowBrowser: true });

  const imageBlocks = params.frames.flatMap((frame) => {
    const match = frame.dataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) return [];
    const [, mediaType, data] = match;
    return [
      { type: 'text' as const, text: `Frame at ${frame.timeLabel}:` },
      {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType as 'image/jpeg' | 'image/png',
          data,
        },
      },
    ];
  });

  const message = await client.messages.create({
    model: params.model,
    max_tokens: 8192,
    system: buildSystemPrompt(params.statThresholds),
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: ANALYSIS_TOOL.name },
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: buildUserText(params) }, ...imageBlocks],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );

  if (!toolUse) {
    throw new Error('The model did not return a structured analysis. Try again.');
  }

  return toolUse.input as AnalysisResult;
}
