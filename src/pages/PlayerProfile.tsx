import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { analysesStore, gamesStore, playersStore } from '../lib/db';
import type { Analysis, Game, Player, PlayerNote } from '../types';
import { Badge, Card, EmptyState } from '../components/ui';
import { nonZeroStats, sumStats } from '../lib/stats';

interface NoteWithContext {
  note: PlayerNote;
  analysis: Analysis;
  game?: Game;
}

function matches(note: PlayerNote, player: Player): boolean {
  if (note.jerseyNumber && note.jerseyNumber.replace(/\D/g, '') === player.number.replace(/\D/g, '')) {
    return true;
  }
  if (note.playerName && note.playerName.trim().toLowerCase() === player.name.trim().toLowerCase()) {
    return true;
  }
  return false;
}

export default function PlayerProfile() {
  const { playerId } = useParams<{ playerId: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [notes, setNotes] = useState<NoteWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    (async () => {
      const p = await playersStore.get(playerId);
      if (!p) {
        setLoading(false);
        return;
      }
      setPlayer(p);
      const [allAnalyses, allGames] = await Promise.all([analysesStore.all(), gamesStore.all()]);
      const gameMap = new Map(allGames.map((g) => [g.id, g]));
      const found: NoteWithContext[] = [];
      for (const analysis of allAnalyses) {
        for (const note of analysis.result.playerNotes ?? []) {
          if (matches(note, p)) {
            found.push({ note, analysis, game: gameMap.get(analysis.gameId) });
          }
        }
      }
      setNotes(found);
      setLoading(false);
    })();
  }, [playerId]);

  const totals = useMemo(() => sumStats(notes.map((n) => n.note.stats)), [notes]);
  const totalsChips = useMemo(() => nonZeroStats(totals), [totals]);

  if (loading) return null;
  if (!player) return <EmptyState title="Player not found" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-700 text-white text-lg font-semibold">
          {player.number}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-emerald-50">{player.name}</h1>
          {player.position && <p className="text-emerald-200/60 text-sm">{player.position}</p>}
        </div>
        <Link to="/roster" className="ml-auto text-sm text-emerald-300 hover:underline">
          Back to roster
        </Link>
      </div>

      {totalsChips.length > 0 && (
        <Card>
          <h2 className="font-medium text-emerald-50 mb-2">Totals across all analyzed games</h2>
          <p className="text-xs text-emerald-200/50 mb-3">
            Summed from every analysis this player appears in. These are film-based estimates, not an official
            scorebook.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {totalsChips.map((c) => (
              <span
                key={c.label}
                className="text-xs rounded-full bg-emerald-900/50 text-emerald-100 px-2.5 py-1 whitespace-nowrap"
              >
                <span className="text-emerald-300 font-semibold">{c.value}</span> {c.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {notes.length === 0 ? (
        <EmptyState
          title="No film notes yet"
          description="This player hasn't appeared in any analysis results. Notes show up here once the AI identifies them by jersey number or name in a review."
        />
      ) : (
        <div className="space-y-3">
          {notes.map(({ note, analysis, game }, i) => (
            <Card key={i}>
              <div className="flex items-center gap-2 mb-2 text-xs text-emerald-200/50">
                {game && (
                  <Link to={`/games/${game.id}`} className="text-emerald-300 hover:underline">
                    {game.title}
                  </Link>
                )}
                <span>·</span>
                <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                {note.grade && (
                  <>
                    <span>·</span>
                    <Badge tone="good">{note.grade}</Badge>
                  </>
                )}
              </div>
              {nonZeroStats(note.stats).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {nonZeroStats(note.stats).map((c) => (
                    <span
                      key={c.label}
                      className="text-[11px] rounded-full bg-emerald-900/50 text-emerald-100 px-2 py-0.5 whitespace-nowrap"
                    >
                      <span className="text-emerald-300 font-semibold">{c.value}</span> {c.label}
                    </span>
                  ))}
                </div>
              )}
              {note.observations.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-1">Observations</p>
                  <ul className="space-y-1">
                    {note.observations.map((o, j) => (
                      <li key={j} className="text-sm text-emerald-100">
                        • {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {note.recommendations.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-200/50 mb-1">Recommendations</p>
                  <ul className="space-y-1">
                    {note.recommendations.map((r, j) => (
                      <li key={j} className="text-sm text-emerald-100">
                        • {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
