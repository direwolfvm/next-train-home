'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UserSettings,
  StationConfig,
  DirectionConfig,
  WmataStation,
  TrainPrediction,
  LineCode,
} from '@/lib/types'
import { LINE_COLORS } from '@/lib/constants'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '@/lib/settings'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAvailableLines(stations: WmataStation[], code: string): LineCode[] {
  const station = stations.find(s => s.Code === code)
  if (!station) return []
  return [station.LineCode1, station.LineCode2, station.LineCode3, station.LineCode4]
    .filter((l): l is LineCode => !!l && l !== '' && l !== 'None' && l in LINE_COLORS)
}

function defaultDirectionForStation(
  stations: WmataStation[],
  code: string,
  name: string,
): DirectionConfig[] {
  const lines = getAvailableLines(stations, code)
  return [{ group: '1', lines, label: 'Direction 1' }]
}

// ─── GroupPreviewCard ────────────────────────────────────────────────────────

function GroupPreviewCard({
  groupLabel,
  trains,
}: {
  groupLabel: string
  trains: TrainPrediction[]
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
        {groupLabel}
      </p>
      {trains.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">No trains right now</p>
      ) : (
        <ul className="space-y-1.5">
          {trains.map((t, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  backgroundColor: LINE_COLORS[t.Line]?.bg ?? '#888',
                  color: LINE_COLORS[t.Line]?.text ?? '#fff',
                }}
              >
                {t.Line}
              </span>
              <span className="text-slate-700 dark:text-slate-300 truncate flex-1">
                {t.DestinationName || t.Destination}
              </span>
              <span className="text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                {t.Min === 'BRD' || t.Min === 'ARR' ? t.Min : `${t.Min}m`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── DirectionConfigRow ──────────────────────────────────────────────────────

function DirectionConfigRow({
  index,
  dir,
  availableLines,
  onChange,
  onRemove,
}: {
  index: number
  dir: DirectionConfig
  availableLines: LineCode[]
  onChange: (dir: DirectionConfig) => void
  onRemove?: () => void
}) {
  function toggleLine(line: LineCode) {
    const selected = dir.lines.includes(line)
    const newLines = selected
      ? dir.lines.filter(l => l !== line)
      : [...dir.lines, line]
    if (newLines.length > 0) onChange({ ...dir, lines: newLines })
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Direction {index + 1}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Label</label>
        <input
          type="text"
          value={dir.label}
          onChange={e => onChange({ ...dir, label: e.target.value })}
          placeholder="e.g. Northbound"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Group */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          WMATA Group — use the live preview above to identify which is which
        </label>
        <div className="flex gap-2">
          {(['1', '2'] as const).map(g => (
            <button
              key={g}
              onClick={() => onChange({ ...dir, group: g })}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                dir.group === g
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              Group {g}
            </button>
          ))}
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Lines to show</label>
        <div className="flex flex-wrap gap-2">
          {availableLines.map(line => {
            const colors = LINE_COLORS[line]
            const selected = dir.lines.includes(line)
            return (
              <button
                key={line}
                onClick={() => toggleLine(line)}
                className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                  selected ? 'opacity-100' : 'opacity-35'
                }`}
                style={selected
                  ? { backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }
                  : { backgroundColor: 'transparent', color: colors.bg, borderColor: colors.bg }
                }
              >
                {colors.name}
              </button>
            )
          })}
          {availableLines.length === 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">No lines available for this station</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── StationSettingsSection ──────────────────────────────────────────────────

function StationSettingsSection({
  emoji,
  label,
  config,
  stations,
  stationsLoading,
  stationsError,
  onChange,
}: {
  emoji: string
  label: string
  config: StationConfig
  stations: WmataStation[]
  stationsLoading: boolean
  stationsError: string | null
  onChange: (config: StationConfig) => void
}) {
  const [previewTrains, setPreviewTrains] = useState<TrainPrediction[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewCode, setPreviewCode] = useState(config.stationCode)

  useEffect(() => {
    if (!previewCode) return
    setPreviewLoading(true)
    setPreviewError(null)
    fetch(`/api/predictions?stations=${previewCode}`)
      .then(r => r.json())
      .then(data => setPreviewTrains(data.Trains ?? []))
      .catch(() => setPreviewError('Could not fetch live preview'))
      .finally(() => setPreviewLoading(false))
  }, [previewCode])

  function handleStationChange(code: string) {
    const station = stations.find(s => s.Code === code)
    if (!station) return
    const directions = defaultDirectionForStation(stations, code, station.Name)
    onChange({ ...config, stationCode: code, stationName: station.Name, directions })
    setPreviewCode(code)
  }

  function handleDirectionChange(i: number, dir: DirectionConfig) {
    const newDirs = config.directions.map((d, idx) => idx === i ? dir : d)
    onChange({ ...config, directions: newDirs })
  }

  function addDirection() {
    const lines = getAvailableLines(stations, config.stationCode)
    const newDir: DirectionConfig = {
      group: config.directions[0]?.group === '1' ? '2' : '1',
      lines,
      label: 'Direction 2',
    }
    onChange({ ...config, directions: [...config.directions, newDir] })
  }

  function removeDirection(i: number) {
    onChange({ ...config, directions: config.directions.filter((_, idx) => idx !== i) })
  }

  const availableLines = getAvailableLines(stations, config.stationCode)
  const group1Trains = previewTrains.filter(t => t.Group === '1').slice(0, 3)
  const group2Trains = previewTrains.filter(t => t.Group === '2').slice(0, 3)

  return (
    <section className="space-y-5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <span>{emoji}</span> {label}
      </h2>

      {/* Station picker */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Station</label>
        {stationsLoading ? (
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : stationsError ? (
          <p className="text-sm text-rose-500">{stationsError}</p>
        ) : (
          <select
            value={config.stationCode}
            onChange={e => handleStationChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {stations.map(s => (
              <option key={s.Code} value={s.Code}>
                {s.Name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Walking distance */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Walking distance (minutes)
        </label>
        <input
          type="number"
          min={0}
          max={60}
          value={config.walkingMinutes}
          onChange={e => onChange({ ...config, walkingMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
          className="w-24 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Live direction preview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Live direction preview — identify Group 1 vs Group 2
        </p>
        {previewLoading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Fetching live trains…</p>
        )}
        {previewError && (
          <p className="text-sm text-rose-500">{previewError}</p>
        )}
        {!previewLoading && !previewError && (
          <div className="grid grid-cols-2 gap-3">
            <GroupPreviewCard groupLabel="Group 1" trains={group1Trains} />
            <GroupPreviewCard groupLabel="Group 2" trains={group2Trains} />
          </div>
        )}
      </div>

      {/* Direction configs */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tracked directions</label>
        {config.directions.map((dir, i) => (
          <DirectionConfigRow
            key={i}
            index={i}
            dir={dir}
            availableLines={availableLines}
            onChange={d => handleDirectionChange(i, d)}
            onRemove={config.directions.length > 1 ? () => removeDirection(i) : undefined}
          />
        ))}
        {config.directions.length < 2 && (
          <button
            onClick={addDirection}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            + Add second direction
          </button>
        )}
      </div>
    </section>
  )
}

// ─── Settings Page ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings())
  const [stations, setStations] = useState<WmataStation[]>([])
  const [stationsLoading, setStationsLoading] = useState(true)
  const [stationsError, setStationsError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/stations')
      .then(r => r.json())
      .then(data => {
        const list = (data.Stations as WmataStation[]) ?? []
        setStations(list.sort((a, b) => a.Name.localeCompare(b.Name)))
      })
      .catch(() => setStationsError('Could not load station list'))
      .finally(() => setStationsLoading(false))
  }, [])

  function handleSave() {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => router.push('/'), 600)
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Reset defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        <StationSettingsSection
          emoji="🏠"
          label="Home Station"
          config={settings.home}
          stations={stations}
          stationsLoading={stationsLoading}
          stationsError={stationsError}
          onChange={config => setSettings(prev => ({ ...prev, home: config }))}
        />

        <div className="border-t border-slate-200 dark:border-slate-800" />

        <StationSettingsSection
          emoji="💼"
          label="Work Station"
          config={settings.work}
          stations={stations}
          stationsLoading={stationsLoading}
          stationsError={stationsError}
          onChange={config => setSettings(prev => ({ ...prev, work: config }))}
        />

        <footer className="pt-6 border-t border-slate-200 dark:border-slate-800/60">
          <p className="text-xs text-slate-400 dark:text-slate-700">
            Settings are saved in your browser. Powered by WMATA API.
          </p>
        </footer>
      </main>
    </div>
  )
}
