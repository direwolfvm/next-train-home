'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  TrainPrediction,
  RailIncident,
  ElevatorIncident,
  FrequencySnapshot,
  LineFrequencyStats,
  Station,
  UserSettings,
} from '@/lib/types'
import { calcInstantFrequency, addSnapshot, deriveFrequencyStats } from '@/lib/frequency'
import { filterDirection } from '@/lib/trainFilter'
import { loadSettings } from '@/lib/settings'
import StationBoard from '@/components/StationBoard'

const POLL_INTERVAL_MS = 30_000

type SnapshotMap = Record<string, FrequencySnapshot[]>

function makeSnapshotMap(lines: readonly string[]): SnapshotMap {
  return Object.fromEntries(lines.map(l => [l, []]))
}

// key: `${stationCode}:${directionIndex}`, e.g. "C13:0", "C03:1"
type AllSnapshotMaps = Record<string, SnapshotMap>
type AllArrivalMaps = Record<string, Record<string, number>>

function makeAllSnapshots(settings: UserSettings): AllSnapshotMaps {
  const result: AllSnapshotMaps = {}
  for (const role of ['home', 'work'] as const) {
    const station = settings[role]
    station.directions.forEach((dir, i) => {
      result[`${station.stationCode}:${i}`] = makeSnapshotMap(dir.lines)
    })
  }
  return result
}

interface StationData {
  trains: TrainPrediction[]
  lastUpdated: Date | null
  error: string | null
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function formatClock(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

const MIN_ARRIVAL_GAP_MS = 3 * 60 * 1000

function recordArrivals(
  trains: TrainPrediction[],
  lastArrivalMap: Record<string, number>,
  snapshotMap: SnapshotMap,
): void {
  const now = Date.now()
  for (const train of trains) {
    if (train.Min !== 'ARR' && train.Min !== 'BRD') continue
    const line = train.Line
    if (!(line in snapshotMap)) continue

    const last = lastArrivalMap[line]
    if (last !== undefined && now - last < MIN_ARRIVAL_GAP_MS) continue

    if (last !== undefined) {
      const intervalMin = (now - last) / 60_000
      if (intervalMin >= 1 && intervalMin <= 60) {
        snapshotMap[line] = addSnapshot(snapshotMap[line], intervalMin)
      }
    }
    lastArrivalMap[line] = now
  }
}

function updateLineFreq(
  snapshotMap: SnapshotMap,
  trainsByLine: Record<string, TrainPrediction[]>
): LineFrequencyStats {
  const stats: LineFrequencyStats = {}
  for (const line of Object.keys(snapshotMap)) {
    const trains = trainsByLine[line] ?? []
    const freq = calcInstantFrequency(trains)
    if (freq !== null) {
      snapshotMap[line] = addSnapshot(snapshotMap[line], freq)
    }
    stats[line] = deriveFrequencyStats(snapshotMap[line])
  }
  return stats
}

export default function Page() {
  const [activeStation, setActiveStation] = useState<Station>('home')
  const [displayMode, setDisplayMode] = useState(false)
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)
  const now = useClock()

  const [settings] = useState<UserSettings>(() => loadSettings())

  // Wake Lock — keep display on while in display mode
  useEffect(() => {
    if (!displayMode) {
      wakeLockRef.current?.release()
      wakeLockRef.current = null
      return
    }

    async function requestWakeLock() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wakeLockRef.current = await (navigator as any).wakeLock?.request('screen')
      } catch {
        // Wake Lock not supported or denied — continue without it
      }
    }

    requestWakeLock()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [displayMode])

  const [stationData, setStationData] = useState<Record<'home' | 'work', StationData>>({
    home: { trains: [], lastUpdated: null, error: null },
    work: { trains: [], lastUpdated: null, error: null },
  })

  const [railIncidents, setRailIncidents] = useState<RailIncident[]>([])
  const [elevatorIncidentsHome, setElevatorIncidentsHome] = useState<ElevatorIncident[]>([])
  const [elevatorIncidentsWork, setElevatorIncidentsWork] = useState<ElevatorIncident[]>([])

  // Compound-keyed snapshot and arrival maps
  const snapshotMapsRef = useRef<AllSnapshotMaps>(makeAllSnapshots(settings))
  const lastArrivalMapsRef = useRef<AllArrivalMaps>({})

  // Frequency stats keyed by `${stationCode}:${directionIndex}`
  const [freqStatsByKey, setFreqStatsByKey] = useState<Record<string, LineFrequencyStats>>({})

  const fetchPredictions = useCallback(async (stationCode: string): Promise<TrainPrediction[]> => {
    const res = await fetch(`/api/predictions?stations=${stationCode}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.Trains ?? []
  }, [])

  const fetchIncidents = useCallback(async (stationCode?: string) => {
    const url = stationCode ? `/api/incidents?stationCode=${stationCode}` : '/api/incidents'
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }, [])

  const poll = useCallback(async () => {
    const [homeResult, workResult, incResult] = await Promise.allSettled([
      fetchPredictions(settings.home.stationCode),
      fetchPredictions(settings.work.stationCode),
      fetchIncidents(settings.home.stationCode),
    ])

    // Helper: update frequency for one station's result
    function processStation(
      role: 'home' | 'work',
      trains: TrainPrediction[],
    ) {
      const station = settings[role]
      const freqUpdates: Record<string, LineFrequencyStats> = {}

      station.directions.forEach((dir, i) => {
        const key = `${station.stationCode}:${i}`
        const snapMap = snapshotMapsRef.current[key]
        if (!snapMap) return

        const dirTrains = filterDirection(trains, dir)

        if (!lastArrivalMapsRef.current[key]) lastArrivalMapsRef.current[key] = {}
        recordArrivals(dirTrains, lastArrivalMapsRef.current[key], snapMap)

        const byLine = Object.fromEntries(
          dir.lines.map(line => [line, dirTrains.filter(t => t.Line === line)])
        )
        freqUpdates[key] = updateLineFreq(snapMap, byLine)
      })

      setFreqStatsByKey(prev => ({ ...prev, ...freqUpdates }))
    }

    if (homeResult.status === 'fulfilled') {
      const trains = homeResult.value
      setStationData(prev => ({ ...prev, home: { trains, lastUpdated: new Date(), error: null } }))
      processStation('home', trains)
    } else {
      setStationData(prev => ({ ...prev, home: { ...prev.home, error: 'Failed to fetch home station data' } }))
    }

    if (workResult.status === 'fulfilled') {
      const trains = workResult.value
      setStationData(prev => ({ ...prev, work: { trains, lastUpdated: new Date(), error: null } }))
      processStation('work', trains)
    } else {
      setStationData(prev => ({ ...prev, work: { ...prev.work, error: 'Failed to fetch work station data' } }))
    }

    if (incResult.status === 'fulfilled') {
      const data = incResult.value
      setRailIncidents(data.Incidents ?? [])
      setElevatorIncidentsHome(data.ElevatorIncidents ?? [])
    }

    try {
      const workInc = await fetchIncidents(settings.work.stationCode)
      setElevatorIncidentsWork(workInc.ElevatorIncidents ?? [])
    } catch {
      // Non-critical
    }
  }, [settings, fetchPredictions, fetchIncidents])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [poll])

  const homeFreqStats = settings.home.directions.map((_, i) =>
    freqStatsByKey[`${settings.home.stationCode}:${i}`] ?? {}
  )
  const workFreqStats = settings.work.directions.map((_, i) =>
    freqStatsByKey[`${settings.work.stationCode}:${i}`] ?? {}
  )

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center font-black text-white text-lg"
              style={{ background: 'linear-gradient(135deg, #009CDE 0%, #1557B0 100%)' }}
            >
              M
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest leading-none">NextTrain</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">Home</p>
            </div>
          </div>

          {/* Clock */}
          <div className="hidden sm:block text-right">
            {now && (
              <>
                <p className="text-sm font-mono text-slate-800 dark:text-slate-200 tabular-nums">{formatClock(now)}</p>
                <p className="text-xs text-slate-500">{formatDate(now)}</p>
              </>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Settings link */}
            <Link
              href="/settings"
              title="Settings"
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>

            {/* Display mode toggle */}
            <button
              onClick={() => setDisplayMode(d => !d)}
              title={displayMode ? 'Exit display mode' : 'Display mode — keep screen awake'}
              className={`p-1.5 rounded-lg border transition-colors ${
                displayMode
                  ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </button>

            {/* Station toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveStation('home')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeStation === 'home'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <span>🏠</span>
                <span>Home</span>
              </button>
              <button
                onClick={() => setActiveStation('work')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeStation === 'work'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <span>💼</span>
                <span>Work</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeStation === 'home' ? (
          <StationBoard
            config={settings.home}
            trains={stationData.home.trains}
            railIncidents={railIncidents}
            elevatorIncidents={elevatorIncidentsHome}
            freqStatsByDirection={homeFreqStats}
            lastUpdated={stationData.home.lastUpdated}
            error={stationData.home.error}
          />
        ) : (
          <StationBoard
            config={settings.work}
            trains={stationData.work.trains}
            railIncidents={railIncidents}
            elevatorIncidents={elevatorIncidentsWork}
            freqStatsByDirection={workFreqStats}
            lastUpdated={stationData.work.lastUpdated}
            error={stationData.work.error}
          />
        )}

        <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-700">
            <p>Powered by WMATA API · Refreshes every 30s</p>
            <p>NextTrainHome</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
