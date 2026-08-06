import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Analysis, Game, Player } from '../types';

interface FilmDB extends DBSchema {
  players: {
    key: string;
    value: Player;
  };
  games: {
    key: string;
    value: Game;
  };
  analyses: {
    key: string;
    value: Analysis;
    indexes: { gameId: string };
  };
}

let dbPromise: Promise<IDBPDatabase<FilmDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FilmDB>('flag-film-analyzer', 1, {
      upgrade(db) {
        db.createObjectStore('players', { keyPath: 'id' });
        db.createObjectStore('games', { keyPath: 'id' });
        const analyses = db.createObjectStore('analyses', { keyPath: 'id' });
        analyses.createIndex('gameId', 'gameId');
      },
    });
  }
  return dbPromise;
}

export const playersStore = {
  async all(): Promise<Player[]> {
    const db = await getDb();
    const all = await db.getAll('players');
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id: string): Promise<Player | undefined> {
    const db = await getDb();
    return db.get('players', id);
  },
  async put(player: Player): Promise<void> {
    const db = await getDb();
    await db.put('players', player);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('players', id);
  },
};

export const gamesStore = {
  async all(): Promise<Game[]> {
    const db = await getDb();
    const all = await db.getAll('games');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
  async get(id: string): Promise<Game | undefined> {
    const db = await getDb();
    return db.get('games', id);
  },
  async put(game: Game): Promise<void> {
    const db = await getDb();
    await db.put('games', game);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['games', 'analyses'], 'readwrite');
    await tx.objectStore('games').delete(id);
    const analysisIndex = tx.objectStore('analyses').index('gameId');
    let cursor = await analysisIndex.openCursor(IDBKeyRange.only(id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
};

export const analysesStore = {
  async all(): Promise<Analysis[]> {
    const db = await getDb();
    const all = await db.getAll('analyses');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
  async byGame(gameId: string): Promise<Analysis[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex('analyses', 'gameId', gameId);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
  async get(id: string): Promise<Analysis | undefined> {
    const db = await getDb();
    return db.get('analyses', id);
  },
  async put(analysis: Analysis): Promise<void> {
    const db = await getDb();
    await db.put('analyses', analysis);
  },
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('analyses', id);
  },
};
