import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { playersStore } from '../lib/db';
import type { Player } from '../types';
import { Button, Card, EmptyState, Input } from '../components/ui';

const emptyForm = { name: '', number: '', position: '', notes: '' };

export default function Roster() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setPlayers(await playersStore.all());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.number.trim()) return;
    const player: Player = {
      id: editingId ?? uuid(),
      name: form.name.trim(),
      number: form.number.trim(),
      position: form.position.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: Date.now(),
    };
    await playersStore.put(player);
    setForm(emptyForm);
    setEditingId(null);
    refresh();
  }

  function edit(player: Player) {
    setEditingId(player.id);
    setForm({
      name: player.name,
      number: player.number,
      position: player.position ?? '',
      notes: player.notes ?? '',
    });
  }

  async function remove(id: string) {
    if (!confirm('Remove this player from the roster?')) return;
    await playersStore.remove(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-50">Roster</h1>
        <p className="text-emerald-200/60 text-sm mt-1">
          Add players so the AI can cross-reference jersey numbers it sees in the film with names.
        </p>
      </div>

      <Card>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-1">
            <label className="block text-xs text-emerald-200/60 mb-1">Number</label>
            <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="7" required />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs text-emerald-200/60 mb-1">Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Lee" required />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs text-emerald-200/60 mb-1">Position</label>
            <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="QB / Rusher / Flag chaser..." />
          </div>
          <div className="sm:col-span-1 flex gap-2">
            <Button type="submit" className="flex-1">
              {editingId ? 'Save changes' : 'Add player'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {loading ? null : players.length === 0 ? (
        <EmptyState title="No players yet" description="Add your first player above to build the roster." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {players.map((p) => (
            <Card key={p.id} className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white text-sm font-semibold">
                    {p.number}
                  </span>
                  <span className="font-medium text-emerald-50">{p.name}</span>
                </div>
                {p.position && <p className="text-xs text-emerald-200/50 mt-1">{p.position}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <Link to={`/players/${p.id}`}>
                  <Button variant="ghost" className="text-xs px-2 py-1 w-full">
                    Notes
                  </Button>
                </Link>
                <Button variant="ghost" className="text-xs px-2 py-1" onClick={() => edit(p)}>
                  Edit
                </Button>
                <Button variant="ghost" className="text-xs px-2 py-1 text-red-300" onClick={() => remove(p.id)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
