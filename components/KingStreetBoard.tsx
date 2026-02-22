'use client'

import { TrainPrediction, RailIncident, ElevatorIncident, LineFrequencyStats } from '@/lib/types'
import {
  KING_STREET_LINES,
  KING_STREET_VA_TERMINALS,
  KING_STREET_INCIDENT_LINES,
  WALKING_MINUTES,
  MAX_ARRIVALS,
} from '@/lib/constants'
import TrainTable from './TrainTable'
import FrequencyPanel from './FrequencyPanel'
import IncidentsPanel from './IncidentsPanel'

interface KingStreetBoardProps {
  trains: TrainPrediction[]
  railIncidents: RailIncident[]
  elevatorIncidents: ElevatorIncident[]
  freqStats: LineFrequencyStats
  lastUpdated: Date | null
  error: string | null
  compact?: boolean
}

export function filterNorthbound(trains: TrainPrediction[]): TrainPrediction[] {
  return trains.filter(t => {
    if (!KING_STREET_LINES.has(t.Line)) return false
    if (t.Line === 'No' || t.Line === '') return false
    // Exclude trains heading to Virginia terminals
    if (t.DestinationCode && KING_STREET_VA_TERMINALS.has(t.DestinationCode)) return false
    // Exclude "No Passenger" trains
    if (t.DestinationName === 'No Passenger') return false
    return true
  })
}

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ${ampm}`
}

export default function KingStreetBoard({
  trains,
  railIncidents,
  elevatorIncidents,
  freqStats,
  lastUpdated,
  error,
  compact,
}: KingStreetBoardProps) {
  const northbound = filterNorthbound(trains).slice(0, MAX_ARRIVALS)

  return (
    <div className={compact ? 'space-y-2' : 'space-y-5'}>
      {/* Station header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {/* Metro line orbs */}
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: '#009CDE' }}
            />
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: '#FFD100' }}
            />
            <span className="text-xs text-slate-500 uppercase tracking-widest ml-1">
              Blue · Yellow
            </span>
          </div>
          <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-slate-100 leading-tight`}>
            King Street–Old Town
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Northbound · {WALKING_MINUTES.KING_STREET} min walk
          </p>
        </div>
        <div className="text-right">
          {lastUpdated && (
            <p className="text-xs text-slate-400 dark:text-slate-600 tabular-nums">
              {formatTime(lastUpdated)}
            </p>
          )}
          {error && (
            <p className="text-xs text-rose-500 mt-1">⚠ {error}</p>
          )}
        </div>
      </div>

      {/* Train predictions table */}
      <div className="rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-4 py-3">
        <TrainTable
          trains={northbound}
          walkingMinutes={WALKING_MINUTES.KING_STREET}
          emptyMessage="No northbound trains predicted"
          compact={compact}
        />
      </div>

      {/* Frequency — per line */}
      <FrequencyPanel stats={freqStats} label="Northbound Frequency" compact={compact} />

      {/* Incidents */}
      <IncidentsPanel
        railIncidents={railIncidents}
        elevatorIncidents={elevatorIncidents}
        relevantLines={KING_STREET_INCIDENT_LINES}
        compact={compact}
      />
    </div>
  )
}
