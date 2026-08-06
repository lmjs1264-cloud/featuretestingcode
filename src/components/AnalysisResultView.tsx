import type { Analysis } from '../types';
import { Badge, Card } from './ui';

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

export default function AnalysisResultView({ analysis }: { analysis: Analysis }) {
  const { result } = analysis;

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

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-medium text-emerald-50 mb-2">Team strengths</h3>
          <List items={result.teamSummary?.strengths ?? []} tone="good" />
        </Card>
        <Card>
          <h3 className="font-medium text-emerald-50 mb-2">Team weaknesses</h3>
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
          <h3 className="font-medium text-emerald-50">Player notes</h3>
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
