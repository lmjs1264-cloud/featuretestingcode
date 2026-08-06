import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { Button, Card, Input, Textarea } from '../components/ui';
import { analyzeFilm } from '../lib/analyze';
import { extractFrames } from '../lib/frames';
import { analysesStore, gamesStore, playersStore } from '../lib/db';
import { getApiKey, getModel } from '../state/settings';
import { DEFAULT_FOCUS_AREAS, DEFAULT_STAT_THRESHOLDS } from '../types';
import type { Player, StatThresholds } from '../types';

type Step = 1 | 2 | 3 | 4;

export default function NewAnalysis() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  // Step 1: game info
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Step 2: video + frames
  const [file, setFile] = useState<File | null>(null);
  const [frameCount, setFrameCount] = useState(24);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [frames, setFrames] = useState<{ dataUrl: string; timeLabel: string }[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractError, setExtractError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: focus areas & stat calibration
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [customFocus, setCustomFocus] = useState('');
  const [statThresholds, setStatThresholds] = useState<StatThresholds>(DEFAULT_STAT_THRESHOLDS);

  // Step 4: run
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [roster, setRoster] = useState<Player[]>([]);

  const apiKey = getApiKey();

  useEffect(() => {
    playersStore.all().then(setRoster);
  }, []);

  function handleFile(f: File | null) {
    setFileError('');
    if (f && !f.type.startsWith('video/')) {
      setFileError(`"${f.name}" doesn't look like a video file.`);
      return;
    }
    setFile(f);
    setFrames([]);
  }

  function toggleFocus(area: string) {
    setFocusAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  }

  async function runExtraction() {
    if (!file) return;
    setExtracting(true);
    setExtractError('');
    setExtractProgress(0);
    try {
      const result = await extractFrames(file, {
        frameCount,
        startFraction: trimStart / 100,
        endFraction: trimEnd / 100,
        onProgress: (done, total) => setExtractProgress(Math.round((done / total) * 100)),
      });
      setFrames(result);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Could not extract frames from that video.');
    } finally {
      setExtracting(false);
    }
  }

  async function runAnalysis() {
    setRunning(true);
    setRunError('');
    try {
      const gameId = uuid();
      const result = await analyzeFilm({
        apiKey,
        model: getModel(),
        frames,
        roster,
        focusAreas,
        customFocusNotes: customFocus.trim() || undefined,
        gameContext: `${title}${opponent ? ` vs ${opponent}` : ''} — ${date}`,
        statThresholds,
      });

      await gamesStore.put({
        id: gameId,
        title: title.trim() || 'Untitled game',
        opponent: opponent.trim() || undefined,
        date,
        createdAt: Date.now(),
      });

      const analysisId = uuid();
      await analysesStore.put({
        id: analysisId,
        gameId,
        title: focusAreas.length ? focusAreas.join(', ') : 'General review',
        focusAreas,
        customFocusNotes: customFocus.trim() || undefined,
        statThresholds,
        model: getModel(),
        createdAt: Date.now(),
        frames,
        result,
      });

      navigate(`/games/${gameId}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Analysis failed. Check your API key and try again.');
    } finally {
      setRunning(false);
    }
  }

  const canProceedStep1 = title.trim().length > 0;
  const canProceedStep2 = frames.length > 0 && !extracting;

  const videoUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-50">Analyze film</h1>
        <p className="text-emerald-200/60 text-sm mt-1">Step {step} of 4</p>
      </div>

      {!apiKey && (
        <Card className="border-amber-700/60 bg-amber-950/30 text-amber-100 text-sm">
          You haven't set an Anthropic API key yet. Add one in{' '}
          <a href="/settings" className="underline">
            Settings
          </a>{' '}
          before running an analysis — you can still prep everything else now.
        </Card>
      )}

      {step === 1 && (
        <Card className="space-y-4">
          <h2 className="font-medium text-emerald-50">Game info</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-emerald-200/60 mb-1">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 4 vs Hawks" />
            </div>
            <div>
              <label className="block text-xs text-emerald-200/60 mb-1">Opponent (optional)</label>
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Hawks" />
            </div>
            <div>
              <label className="block text-xs text-emerald-200/60 mb-1">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={!canProceedStep1} onClick={() => setStep(2)}>
              Next: Upload film
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-4">
          <h2 className="font-medium text-emerald-50">Upload film &amp; sample frames</h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              isDragging
                ? 'border-emerald-400 bg-emerald-900/40'
                : 'border-emerald-900/60 hover:border-emerald-700 hover:bg-emerald-950/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <p className="text-emerald-100 font-medium">
              {file ? file.name : 'Drop a game video here, or click to browse'}
            </p>
            <p className="text-xs text-emerald-200/50 mt-1">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB — drop a new file to replace it`
                : 'MP4, MOV, or any format your browser can play'}
            </p>
          </div>

          {fileError && <p className="text-sm text-red-300">{fileError}</p>}

          {file && (
            <video src={videoUrl} controls className="w-full rounded-lg max-h-72 bg-black" />
          )}

          {file && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-emerald-200/60 mb-1">Frames to sample: {frameCount}</label>
                <input
                  type="range"
                  min={6}
                  max={48}
                  value={frameCount}
                  onChange={(e) => setFrameCount(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-[11px] text-emerald-200/40 mt-1">
                  More frames = better stat coverage (more plays actually seen), but slower and pricier per run.
                </p>
              </div>
              <div>
                <label className="block text-xs text-emerald-200/60 mb-1">Clip start: {trimStart}%</label>
                <input
                  type="range"
                  min={0}
                  max={95}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 5))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-emerald-200/60 mb-1">Clip end: {trimEnd}%</label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 5))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {file && (
            <Button type="button" variant="secondary" onClick={runExtraction} disabled={extracting}>
              {extracting ? `Extracting… ${extractProgress}%` : frames.length ? 'Re-extract frames' : 'Extract frames'}
            </Button>
          )}

          {extractError && <p className="text-sm text-red-300">{extractError}</p>}

          {frames.length > 0 && (
            <div>
              <p className="text-xs text-emerald-200/60 mb-2">{frames.length} frames sampled — these images (not the raw video) are what get sent for analysis.</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {frames.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={f.dataUrl} alt={`Frame at ${f.timeLabel}`} className="rounded border border-emerald-900/60 w-full aspect-video object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-[10px] px-1 rounded text-emerald-100">{f.timeLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!canProceedStep2} onClick={() => setStep(3)}>
              Next: Focus areas
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-4">
          <h2 className="font-medium text-emerald-50">What should the AI focus on?</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {DEFAULT_FOCUS_AREAS.map((area) => (
              <label key={area} className="flex items-center gap-2 text-sm text-emerald-100 bg-[#0b1512] border border-emerald-900/50 rounded-md px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={focusAreas.includes(area)} onChange={() => toggleFocus(area)} />
                {area}
              </label>
            ))}
          </div>
          <div>
            <label className="block text-xs text-emerald-200/60 mb-1">Anything else to call out (optional)</label>
            <Textarea
              rows={3}
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
              placeholder="e.g. We've been getting flagged for false starts — pay close attention to snap timing."
            />
          </div>

          <div className="border-t border-emerald-900/50 pt-4">
            <h3 className="font-medium text-emerald-50 text-sm">Pass-depth calibration</h3>
            <p className="text-xs text-emerald-200/50 mt-1 mb-3">
              This app assumes a 60-yard field. Set the yard cutoffs used to classify each pass as short, medium, or
              deep for the team stats (deep is anything past the medium cutoff).
            </p>
            <div className="grid sm:grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="block text-xs text-emerald-200/60 mb-1">Short pass: 0–{statThresholds.shortMaxYards} yds</label>
                <input
                  type="range"
                  min={3}
                  max={statThresholds.mediumMaxYards - 1}
                  value={statThresholds.shortMaxYards}
                  onChange={(e) =>
                    setStatThresholds((prev) => ({ ...prev, shortMaxYards: Number(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-emerald-200/60 mb-1">
                  Medium pass: {statThresholds.shortMaxYards + 1}–{statThresholds.mediumMaxYards} yds (deep is {statThresholds.mediumMaxYards + 1}+)
                </label>
                <input
                  type="range"
                  min={statThresholds.shortMaxYards + 1}
                  max={40}
                  value={statThresholds.mediumMaxYards}
                  onChange={(e) =>
                    setStatThresholds((prev) => ({ ...prev, mediumMaxYards: Number(e.target.value) }))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => setStep(4)}>Next: Review &amp; run</Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="space-y-4">
          <h2 className="font-medium text-emerald-50">Review &amp; run analysis</h2>
          <ul className="text-sm text-emerald-200/80 space-y-1">
            <li>
              <strong className="text-emerald-50">Game:</strong> {title}
              {opponent ? ` vs ${opponent}` : ''} — {date}
            </li>
            <li>
              <strong className="text-emerald-50">Frames:</strong> {frames.length} sampled
            </li>
            <li>
              <strong className="text-emerald-50">Focus areas:</strong>{' '}
              {focusAreas.length ? focusAreas.join(', ') : 'General review'}
            </li>
            <li>
              <strong className="text-emerald-50">Roster loaded:</strong> {roster.length} players
            </li>
            <li>
              <strong className="text-emerald-50">Pass depth:</strong> short 0–{statThresholds.shortMaxYards} ·
              medium {statThresholds.shortMaxYards + 1}–{statThresholds.mediumMaxYards} · deep{' '}
              {statThresholds.mediumMaxYards + 1}+
            </li>
            <li>
              <strong className="text-emerald-50">Model:</strong> {getModel()}
            </li>
          </ul>

          <p className="text-xs text-emerald-200/50">
            Team and player stats are estimated from the {frames.length} sampled frames, not a full play-by-play
            record — treat them as a coach's best read of the film, not an official box score.
          </p>

          {runError && <p className="text-sm text-red-300">{runError}</p>}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)} disabled={running}>
              Back
            </Button>
            <Button onClick={runAnalysis} disabled={running || !apiKey || frames.length === 0}>
              {running ? 'Analyzing film…' : 'Run analysis'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
