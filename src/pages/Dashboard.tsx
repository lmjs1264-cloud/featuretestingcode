import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analysesStore, gamesStore, playersStore } from '../lib/db';
import type { Analysis, Game, Player } from '../types';
import { Button, Card, EmptyState } from '../components/ui';
import { getApiKey } from '../state/settings';

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([gamesStore.all(), analysesStore.all(), playersStore.all()]).then(
      ([g, a, p]) => {
        setGames(g);
        setAnalyses(a);
        setPlayers(p);
        setLoading(false);
      },
    );
  }, []);

  if (loading) return null;

  const hasKey = !!getApiKey();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-50">Dashboard</h1>
          <p className="text-emerald-200/60 text-sm mt-1">
            {games.length} game{games.length === 1 ? '' : 's'} · {analyses.length} analysis run
            {analyses.length === 1 ? '' : 's'} · {players.length} player{players.length === 1 ? '' : 's'} on roster
          </p>
        </div>
        <Link to="/new">
          <Button>New analysis</Button>
        </Link>
      </div>

      {!hasKey && (
        <Card className="border-amber-700/60 bg-amber-950/30 text-amber-100 text-sm">
          Set your Anthropic API key in{' '}
          <Link to="/settings" className="underline">
            Settings
          </Link>{' '}
          to start running film analyses.
        </Card>
      )}

      {games.length === 0 ? (
        <EmptyState
          title="No film analyzed yet"
          description="Upload game footage to get team and player feedback."
          action={
            <Link to="/new">
              <Button>Analyze your first game</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-emerald-200/70 uppercase tracking-wide">Recent games</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((g) => {
              const count = analyses.filter((a) => a.gameId === g.id).length;
              return (
                <Link key={g.id} to={`/games/${g.id}`}>
                  <Card className="hover:border-emerald-600/70 transition-colors h-full">
                    <p className="font-medium text-emerald-50">{g.title}</p>
                    {g.opponent && <p className="text-sm text-emerald-200/60">vs {g.opponent}</p>}
                    <p className="text-xs text-emerald-200/40 mt-2">
                      {new Date(g.date).toLocaleDateString()} · {count} analysis run{count === 1 ? '' : 's'}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
