import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { analysesStore, gamesStore } from '../lib/db';
import type { Analysis, Game } from '../types';
import { Button, Card, EmptyState } from '../components/ui';
import AnalysisResultView, { TeamStatsPanel } from '../components/AnalysisResultView';
import { rollupTeamStats } from '../lib/stats';

export default function GameDetail() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    Promise.all([gamesStore.get(gameId), analysesStore.byGame(gameId)]).then(([g, a]) => {
      setGame(g ?? null);
      setAnalyses(a);
      setActiveId(a[0]?.id ?? null);
      setLoading(false);
    });
  }, [gameId]);

  async function removeGame() {
    if (!gameId || !confirm('Delete this game and all its analyses?')) return;
    await gamesStore.remove(gameId);
    navigate('/');
  }

  if (loading) return null;
  if (!game) return <EmptyState title="Game not found" />;

  const active = analyses.find((a) => a.id === activeId);
  const combined = analyses.length > 1 ? rollupTeamStats(analyses) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-50">
            {game.title}
            {game.opponent && <span className="text-emerald-200/50 font-normal"> vs {game.opponent}</span>}
          </h1>
          <p className="text-emerald-200/60 text-sm mt-1">
            {game.yourTeamName} · {new Date(game.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/games/${game.id}/new`}>
            <Button variant="secondary">Add analysis to this game</Button>
          </Link>
          <Button variant="danger" onClick={removeGame}>
            Delete game
          </Button>
        </div>
      </div>

      {analyses.length === 0 ? (
        <EmptyState
          title="No analyses yet for this game"
          action={
            <Link to={`/games/${game.id}/new`}>
              <Button>Run the first analysis</Button>
            </Link>
          }
        />
      ) : (
        <>
          {combined && (
            <div>
              <h2 className="font-medium text-emerald-50 mb-1">
                Combined team stats — all {analyses.length} analyses
              </h2>
              <p className="text-xs text-emerald-200/50 mb-3">
                Numerically combined across every analysis run for this game (weighted by frames sampled in each).
                Coaching notes below still come from a single analysis at a time — switch tabs to read each
                segment's write-up.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <TeamStatsPanel teamName={game.yourTeamName} stats={combined.yourTeam} />
                </Card>
                <Card>
                  <TeamStatsPanel teamName={game.opponent || 'Opponent'} stats={combined.opponent} />
                </Card>
              </div>
            </div>
          )}

          {analyses.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {analyses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActiveId(a.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    a.id === activeId
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-emerald-900/60 text-emerald-200/70 hover:bg-emerald-900/40'
                  }`}
                >
                  {a.title} — {new Date(a.createdAt).toLocaleDateString()}
                </button>
              ))}
            </div>
          )}
          {active && (
            <Card>
              <AnalysisResultView analysis={active} game={game} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
