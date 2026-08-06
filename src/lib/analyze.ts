import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult, FrameCapture, Player } from '../types';

const ANALYSIS_TOOL = {
  name: 'submit_film_analysis',
  description:
    'Submit structured coaching feedback for a flag football team based on the reviewed film frames.',
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
          },
          required: ['observations', 'recommendations'],
        },
      },
      nextPracticeFocus: {
        type: 'array',
        items: { type: 'string' },
        description: '3-5 concrete, prioritized things to drill at the next practice.',
      },
    },
    required: ['teamSummary', 'focusAreaFindings', 'playerNotes', 'nextPracticeFocus'],
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
}

function buildSystemPrompt(): string {
  return `You are an experienced flag football coach and film analyst helping a youth/adult flag football team improve. You are shown a sequence of still frames sampled from a single game's video, in chronological order with timestamps.

Ground rules:
- Only report what you can actually observe in the frames. Do not invent stats, scores, or events you cannot see.
- Identify players by jersey number when it is legibly visible in a frame. If you cannot confidently read a jersey number, describe the player by position/role/location on the field instead of guessing an identity.
- Cross-reference legible jersey numbers against the provided roster to use player names when possible, but never assert a name you aren't reasonably confident in from a visible number.
- Be specific and actionable. Prefer concrete coaching cues ("get hands up earlier on the rush" ) over vague praise/criticism.
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

Below are ${params.frames.length} frames sampled chronologically from the game film, each labeled with its timestamp. Review them as a sequence and produce your analysis by calling submit_film_analysis. Cover team-level strengths/weaknesses, findings for each requested focus area, individual player notes for anyone identifiable, and a prioritized list of next-practice focus items.`;
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
    max_tokens: 4096,
    system: buildSystemPrompt(),
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
