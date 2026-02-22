'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  TrainPrediction,
  RailIncident,
  ElevatorIncident,
  FrequencySnapshot,
  LineFrequencyStats,
  Station,
} from '@/lib/types'
import { STATION_CODES } from '@/lib/constants'
import { calcInstantFrequency, addSnapshot, deriveFrequencyStats } from '@/lib/frequency'
import { filterNorthbound } from '@/components/KingStreetBoard'
import KingStreetBoard from '@/components/KingStreetBoard'
import FarragutWestBoard from '@/components/FarragutWestBoard'

const POLL_INTERVAL_MS = 30_000

// Lines tracked per station
const KS_LINES = ['BL', 'YL'] as const
const FW_SOUTH_LINES = ['BL'] as const          // southbound: Blue only
const FW_EAST_LINES = ['BL', 'OR', 'SV'] as const // toward Largo: all three

type SnapshotMap = Record<string, FrequencySnapshot[]>

function makeSnapshotMap(lines: readonly string[]): SnapshotMap {
  return Object.fromEntries(lines.map(l => [l, []]))
}

interface StationData {
  trains: TrainPrediction[]
  lastUpdated: Date | null
  error: string | null
}

function useClock() {
  // Start null to avoid server/client mismatch (hydration error).
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

/** Update a snapshot map for a set of lines and return new LineFrequencyStats. */
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
    if (snapshotMap[line].length > 0) {
      stats[line] = deriveFrequencyStats(snapshotMap[line])
    }
  }
  return stats
}

export default function Page() {
  const [activeStation, setActiveStation] = useState<Station>('home')
  const now = useClock()

  const [ksData, setKsData] = useState<StationData>({ trains: [], lastUpdated: null, error: null })
  const [fwData, setFwData] = useState<StationData>({ trains: [], lastUpdated: null, error: null })

  const [railIncidents, setRailIncidents] = useState<RailIncident[]>([])
  const [elevatorIncidentsKS, setElevatorIncidentsKS] = useState<ElevatorIncident[]>([])
  const [elevatorIncidentsFW, setElevatorIncidentsFW] = useState<ElevatorIncident[]>([])

  // Per-line snapshot maps (mutable refs, no re-render on update)
  const ksSnapshots = useRef<SnapshotMap>(makeSnapshotMap(KS_LINES))
  const fwSouthSnapshots = useRef<SnapshotMap>(makeSnapshotMap(FW_SOUTH_LINES))
  const fwEastSnapshots = useRef<SnapshotMap>(makeSnapshotMap(FW_EAST_LINES))

  // Derived frequency stats (trigger re-renders)
  const [ksFreqStats, setKsFreqStats] = useState<LineFrequencyStats>({})
  const [fwSouthFreqStats, setFwSouthFreqStats] = useState<LineFrequencyStats>({})
  const [fwEastFreqStats, setFwEastFreqStats] = useState<LineFrequencyStats>({})

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
    const [ksResult, fwResult, incResult] = await Promise.allSettled([
      fetchPredictions(STATION_CODES.KING_STREET),
      fetchPredictions(STATION_CODES.FARRAGUT_WEST),
      fetchIncidents(STATION_CODES.KING_STREET),
    ])

    // ── King Street ──────────────────────────────────────────
    if (ksResult.status === 'fulfilled') {
      const trains = ksResult.value
      setKsData({ trains, lastUpdated: new Date(), error: null })

      const northbound = filterNorthbound(trains)
      const byLine = Object.fromEntries(
        KS_LINES.map(line => [line, northbound.filter(t => t.Line === line)])
      )
      setKsFreqStats(updateLineFreq(ksSnapshots.current, byLine))
    } else {
      setKsData(prev => ({ ...prev, error: 'Failed to fetch King Street data' }))
    }

    // ── Farragut West ────────────────────────────────────────
    if (fwResult.status === 'fulfilled') {
      const trains = fwResult.value
      setFwData({ trains, lastUpdated: new Date(), error: null })

      // Southbound Blue: Group 2 = westbound at Farragut West
      const southBL = trains.filter(
        t => t.Line === 'BL' && (t.Group === '2' || (t.DestinationCode && ['J03', 'J02'].includes(t.DestinationCode)))
      )
      setFwSouthFreqStats(updateLineFreq(fwSouthSnapshots.current, { BL: southBL }))

      // Eastbound BL / OR / SV: Group 1 = eastbound at Farragut West
      const eastByLine = Object.fromEntries(
        FW_EAST_LINES.map(line => [line, trains.filter(t => t.Line === line && t.Group === '1')])
      )
      setFwEastFreqStats(updateLineFreq(fwEastSnapshots.current, eastByLine))
    } else {
      setFwData(prev => ({ ...prev, error: 'Failed to fetch Farragut West data' }))
    }

    // ── Incidents ────────────────────────────────────────────
    if (incResult.status === 'fulfilled') {
      const data = incResult.value
      setRailIncidents(data.Incidents ?? [])
      setElevatorIncidentsKS(data.ElevatorIncidents ?? [])
    }

    try {
      const fwInc = await fetchIncidents(STATION_CODES.FARRAGUT_WEST)
      setElevatorIncidentsFW(fwInc.ElevatorIncidents ?? [])
    } catch {
      // Non-critical
    }
  }, [fetchPredictions, fetchIncidents])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [poll])

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header bar */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
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
              <p className="text-sm font-semibold text-slate-100 leading-tight">Home</p>
            </div>
          </div>

          {/* Clock */}
          <div className="hidden sm:block text-right">
            {now && (
              <>
                <p className="text-sm font-mono text-slate-200 tabular-nums">{formatClock(now)}</p>
                <p className="text-xs text-slate-500">{formatDate(now)}</p>
              </>
            )}
          </div>

          {/* Station toggle */}
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setActiveStation('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeStation === 'home'
                  ? 'bg-slate-700 text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
            <button
              onClick={() => setActiveStation('work')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeStation === 'work'
                  ? 'bg-slate-700 text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>💼</span>
              <span>Work</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeStation === 'home' ? (
          <KingStreetBoard
            trains={ksData.trains}
            railIncidents={railIncidents}
            elevatorIncidents={elevatorIncidentsKS}
            freqStats={ksFreqStats}
            lastUpdated={ksData.lastUpdated}
            error={ksData.error}
          />
        ) : (
          <FarragutWestBoard
            trains={fwData.trains}
            railIncidents={railIncidents}
            elevatorIncidents={elevatorIncidentsFW}
            southFreqStats={fwSouthFreqStats}
            eastFreqStats={fwEastFreqStats}
            lastUpdated={fwData.lastUpdated}
            error={fwData.error}
          />
        )}

        <footer className="mt-10 pt-6 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <p>Powered by WMATA API · Refreshes every 30s</p>
            <p>NextTrainHome</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
