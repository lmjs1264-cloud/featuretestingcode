const API_KEY_STORAGE = 'flag-film.anthropic-api-key';
const MODEL_STORAGE = 'flag-film.model';
const YOUR_TEAM_NAME_STORAGE = 'flag-film.your-team-name';

export const DEFAULT_MODEL = 'claude-sonnet-5';

export const AVAILABLE_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { id: 'claude-opus-5', label: 'Claude Opus 5 (more thorough, slower)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest, lighter analysis)' },
];

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function setApiKey(key: string): void {
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
}

export function getModel(): string {
  return localStorage.getItem(MODEL_STORAGE) ?? DEFAULT_MODEL;
}

export function setModel(model: string): void {
  localStorage.setItem(MODEL_STORAGE, model);
}

export function getYourTeamName(): string {
  return localStorage.getItem(YOUR_TEAM_NAME_STORAGE) ?? '';
}

export function setYourTeamName(name: string): void {
  if (name) localStorage.setItem(YOUR_TEAM_NAME_STORAGE, name);
  else localStorage.removeItem(YOUR_TEAM_NAME_STORAGE);
}
