import type { Analysis, Game, TeamStats } from '../types';
import { Badge, Card } from './ui';
import { nonZeroStats } from '../lib/stats';

function List({ items, tone }: { items: string[]; tone?: 'good' | 'bad' }) {
  if (!items?.length) return <p className="text-sm text-emerald-200/40">None noted.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-emerald-100 flex gap-2">
          <span className={tone === 'bad' ? 'text-red-400' : tone === 'good' ? 'text-emerald-400' : 'text-emerald-500'}>
            •
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-[#0b1512] border border-emerald-900/50 px-3 py-2 text-center">
      <p className="text-lg font-semibold text-emerald-50">{value}</p>
      <p className="text-[11px] text-emerald-200/50 mt-0.5">{label}</p>
    </div>
  );
}

function TeamStatsPanel({ teamName, stats }: { teamName: string; stats: TeamStats }) {
  return (
    <div>
      <p className="font-medium text-emerald-100 mb-2">{teamName}</p>

      <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-2">Passing</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatTile label="Completion %" value={`${stats.passing.completionPercent}%`} />
        <StatTile label="Short pass mix" value={`${stats.passing.shortPassPercent}%`} />
        <StatTile label="Medium pass mix" value={`${stats.passing.mediumPassPercent}%`} />
        <StatTile label="Deep pass mix" value={`${stats.passing.deepPassPercent}%`} />
        <StatTile label="Yds / short pass" value={stats.passing.yardsPerShortPass} />
        <StatTile label="Yds / medium pass" value={stats.passing.yardsPerMediumPass} />
        <StatTile label="Yds / deep pass" value={stats.passing.yardsPerDeepPass} />
      </div>

      <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-2">Play direction</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="Left %" value={`${stats.playDirection.leftPercent}%`} />
        <StatTile label="Middle %" value={`${stats.playDirection.middlePercent}%`} />
        <StatTile label="Right %" value={`${stats.playDirection.rightPercent}%`} />
      </div>

      <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-2">Defense</p>
      <div className="grid grid-cols-1 gap-2 mb-3">
        <StatTile label="Blitz rate (3+ rushers)" value={`${stats.defense.blitzPercent}%`} />
      </div>

      {stats.methodologyNote && (
        <p className="text-xs text-emerald-200/40 italic mt-2 border-t border-emerald-900/50 pt-2">
          {stats.methodologyNote}
        </p>
      )}
    </div>
  );
}

function PlayerStatChips({ stats }: { stats: Analysis['result']['playerNotes'][number]['stats'] }) {
  const chips = nonZeroStats(stats);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
      {chips.map((c) => (
        <span
          key={c.label}
          className="text-[11px] rounded-full bg-emerald-900/50 text-emerald-100 px-2 py-0.5 whitespace-nowrap"
        >
          <span className="text-emerald-300 font-semibold">{c.value}</span> {c.label}
        </span>
      ))}
    </div>
  );
}

export default function AnalysisResultView({ analysis, game }: { analysis: Analysis; game?: Game }) {
  const { result } = analysis;
  const yourTeamName = game?.yourTeamName || 'Your team';
  const opponentName = game?.opponent || 'Opponent';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {analysis.focusAreas.length === 0 && <Badge>General review</Badge>}
        {analysis.focusAreas.map((f) => (
          <Badge key={f}>{f}</Badge>
        ))}
        <span className="text-xs text-emerald-200/40 ml-auto">
          {new Date(analysis.createdAt).toLocaleString()} · {analysis.frames.length} frames · {analysis.model}
        </span>
      </div>

      <p className="text-xs text-emerald-200/40 -mb-2">
        Coaching notes below focus on <span className="text-emerald-200/70">{yourTeamName}</span>. Team stats are
        tracked independently for both sides.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-medium text-emerald-50 mb-2">{yourTeamName} strengths</h3>
          <List items={result.teamSummary?.strengths ?? []} tone="good" />
        </Card>
        <Card>
          <h3 className="font-medium text-emerald-50 mb-2">{yourTeamName} weaknesses</h3>
          <List items={result.teamSummary?.weaknesses ?? []} tone="bad" />
        </Card>
      </div>

      {result.teamSummary?.keyMoments?.length > 0 && (
        <Card>
          <h3 className="font-medium text-emerald-50 mb-2">Key moments</h3>
          <ul className="space-y-1.5">
            {result.teamSummary.keyMoments.map((m, i) => (
              <li key={i} className="text-sm text-emerald-100">
                {m.timeLabel && <span className="text-emerald-400 font-mono text-xs mr-2">{m.timeLabel}</span>}
                {m.description}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result.teamStats && (
        <div>
          <h3 className="font-medium text-emerald-50 mb-2">Team stats (estimated) — both sides</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <TeamStatsPanel teamName={yourTeamName} stats={result.teamStats.yourTeam} />
            </Card>
            <Card>
              <TeamStatsPanel teamName={opponentName} stats={result.teamStats.opponent} />
            </Card>
          </div>
        </div>
      )}

      {result.focusAreaFindings?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-emerald-50">Focus area findings</h3>
          {result.focusAreaFindings.map((f, i) => (
            <Card key={i}>
              <p className="font-medium text-emerald-100 mb-2">{f.focusArea}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-1">Observations</p>
                  <List items={f.observations} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-1">Recommendations</p>
                  <List items={f.recommendations} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {result.playerNotes?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-emerald-50">{yourTeamName} player notes</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.playerNotes.map((p, i) => (
              <Card key={i}>
                <div className="flex items-center gap-2 mb-2">
                  {p.jerseyNumber && (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-semibold">
                      {p.jerseyNumber}
                    </span>
                  )}
                  <span className="font-medium text-emerald-50">{p.playerName || 'Unidentified player'}</span>
                  {p.grade && <Badge tone="good">{p.grade}</Badge>}
                </div>
                <PlayerStatChips stats={p.stats} />
                <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-1">Observations</p>
                <List items={p.observations} />
                <p className="text-xs uppercase tracking-wide text-emerald-200/50 mt-2 mb-1">Recommendations</p>
                <List items={p.recommendations} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {result.nextPracticeFocus?.length > 0 && (
        <Card className="border-emerald-700/60 bg-emerald-950/40">
          <h3 className="font-medium text-emerald-50 mb-2">Next practice focus</h3>
          <List items={result.nextPracticeFocus} tone="good" />
        </Card>
      )}

      {analysis.frames.length > 0 && (
        <div>
          <p className="text-xs text-emerald-200/50 mb-2">Frames reviewed</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {analysis.frames.map((f, i) => (
              <div key={i} className="relative">
                <img src={f.dataUrl} alt={`Frame at ${f.timeLabel}`} className="rounded border border-emerald-900/60 w-full aspect-video object-cover" />
                <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-[10px] px-1 rounded text-emerald-100">{f.timeLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
