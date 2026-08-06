import { useState } from 'react';
import { Card, Button, Input, Select } from '../components/ui';
import {
  AVAILABLE_MODELS,
  getApiKey,
  getModel,
  getYourTeamName,
  setApiKey,
  setModel,
  setYourTeamName,
} from '../state/settings';

export default function Settings() {
  const [key, setKey] = useState(getApiKey());
  const [model, setModelState] = useState(getModel());
  const [teamName, setTeamName] = useState(getYourTeamName());
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  function save() {
    setApiKey(key.trim());
    setModel(model);
    setYourTeamName(teamName.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-50">Settings</h1>
        <p className="text-emerald-200/60 text-sm mt-1">
          Analysis is powered by the Anthropic API, called directly from your browser with your own key.
          Your key is stored only in this browser's local storage — it is never sent anywhere except
          directly to Anthropic.
        </p>
      </div>

      <Card className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-emerald-100 mb-1">Anthropic API key</label>
          <div className="flex gap-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
            />
            <Button type="button" variant="secondary" onClick={() => setShowKey((s) => !s)}>
              {showKey ? 'Hide' : 'Show'}
            </Button>
          </div>
          <p className="text-xs text-emerald-200/40 mt-1">
            Get a key at{' '}
            <a
              className="underline hover:text-emerald-300"
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
            >
              console.anthropic.com
            </a>
            .
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-100 mb-1">Default "your team" name</label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Eagles, or 'White jerseys'"
          />
          <p className="text-xs text-emerald-200/40 mt-1">
            Pre-fills the "Your team" field when starting a new analysis. Your saved roster is always treated as
            this team — coaching notes and player stats focus on them, while team-level stats are tracked for both
            sides.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-100 mb-1">Model</label>
          <Select value={model} onChange={(e) => setModelState(e.target.value)}>
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save}>Save settings</Button>
          {saved && <span className="text-sm text-emerald-400">Saved.</span>}
        </div>
      </Card>
    </div>
  );
}
