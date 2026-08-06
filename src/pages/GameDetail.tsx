import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { analysesStore, gamesStore } from '../lib/db';
import type { Analysis, Game } from '../types';
import { Button, Card, EmptyState } from '../components/ui';
import AnalysisResultView from '../components/AnalysisResultView';

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-50">
            {game.title}
            {game.opponent && <span className="text-emerald-200/50 font-normal"> vs {game.opponent}</span>}
          </h1>
          <p className="text-emerald-200/60 text-sm mt-1">{new Date(game.date).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/new">
            <Button variant="secondary">New analysis</Button>
          </Link>
          <Button variant="danger" onClick={removeGame}>
            Delete game
          </Button>
        </div>
      </div>

      {analyses.length === 0 ? (
        <EmptyState title="No analyses yet for this game" />
      ) : (
        <>
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
              <AnalysisResultView analysis={active} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
