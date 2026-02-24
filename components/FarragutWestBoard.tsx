'use client'

import { TrainPrediction, RailIncident, ElevatorIncident, LineFrequencyStats } from '@/lib/types'
import {
  FARRAGUT_VA_TERMINALS,
  FARRAGUT_WEST_INCIDENT_LINES,
  WALKING_MINUTES,
  MAX_ARRIVALS,
} from '@/lib/constants'
import TrainTable from './TrainTable'
import FrequencyPanel from './FrequencyPanel'
import IncidentsPanel from './IncidentsPanel'


interface FarragutWestBoardProps {
  trains: TrainPrediction[]
  railIncidents: RailIncident[]
  elevatorIncidents: ElevatorIncident[]
  southFreqStats: LineFrequencyStats   // southbound Blue only
  eastFreqStats: LineFrequencyStats    // eastbound BL / OR / SV
  lastUpdated: Date | null
  error: string | null
  compact?: boolean
}

// At Farragut West, Group '1' = eastbound (toward Largo/New Carrollton),
// Group '2' = westbound (toward Virginia). Confirmed from live API data.
function isSouthboundBlue(train: TrainPrediction): boolean {
  if (train.Line !== 'BL') return false
  if (train.DestinationName === 'No Passenger') return false
  if (train.Group === '2') return true
  if (train.DestinationCode && FARRAGUT_VA_TERMINALS.has(train.DestinationCode)) return true
  return false
}

function isTowardLargo(train: TrainPrediction): boolean {
  const line = train.Line
  if (line !== 'BL' && line !== 'OR' && line !== 'SV') return false
  if (train.DestinationName === 'No Passenger') return false
  if (train.Group === '1') return true
  if (!train.DestinationCode) return false
  return !FARRAGUT_VA_TERMINALS.has(train.DestinationCode)
}

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ${ampm}`
}

export default function FarragutWestBoard({
  trains,
  railIncidents,
  elevatorIncidents,
  southFreqStats,
  eastFreqStats,
  lastUpdated,
  error,
  compact,
}: FarragutWestBoardProps) {
  const southboundBlue = trains.filter(isSouthboundBlue).slice(0, MAX_ARRIVALS)
  const towardLargo = trains.filter(isTowardLargo).slice(0, MAX_ARRIVALS)

  return (
    <div className={compact ? 'space-y-2' : 'space-y-5'}>
      {/* Station header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#009CDE' }} />
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#ED8B00' }} />
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#919D9D' }} />
            <span className="text-xs text-slate-500 uppercase tracking-widest ml-1">
              Blue · Orange · Silver
            </span>
          </div>
          <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-slate-100 leading-tight`}>Farragut West</h2>
          <p className="text-sm text-slate-500 mt-0.5">Work Station</p>
        </div>
        <div className="text-right">
          {lastUpdated && (
            <p className="text-xs text-slate-400 dark:text-slate-600 tabular-nums">{formatTime(lastUpdated)}</p>
          )}
          {error && <p className="text-xs text-rose-500 mt-1">⚠ {error}</p>}
        </div>
      </div>

      {/* Southbound Blue */}
      <div className="rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div
          className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"
          style={{ borderLeftWidth: 3, borderLeftColor: '#009CDE', borderLeftStyle: 'solid' }}
        >
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            To Virginia
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-600">Blue Line southbound</span>
        </div>
        <div className="px-4 py-3">
          <TrainTable
            trains={southboundBlue}
            walkingMinutes={WALKING_MINUTES.FARRAGUT_WEST}
            emptyMessage="No southbound Blue Line trains predicted"
            compact={compact}
          />
        </div>
      </div>

      {/* Southbound Blue frequency */}
      <FrequencyPanel stats={southFreqStats} label="To Virginia · Frequency" compact={compact} />

      {/* Toward Largo */}
      <div className="rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div
          className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"
          style={{ borderLeftWidth: 3, borderLeftColor: '#919D9D', borderLeftStyle: 'solid' }}
        >
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            To Largo / New Carrollton
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-600">Blue · Orange · Silver</span>
        </div>
        <div className="px-4 py-3">
          <TrainTable
            trains={towardLargo}
            walkingMinutes={WALKING_MINUTES.FARRAGUT_WEST}
            emptyMessage="No eastbound trains predicted"
            compact={compact}
          />
        </div>
      </div>

      {/* Eastbound frequency — per line */}
      <FrequencyPanel stats={eastFreqStats} label="To Largo · Frequency by Line" compact={compact} />

      {/* Incidents */}
      <IncidentsPanel
        railIncidents={railIncidents}
        elevatorIncidents={elevatorIncidents}
        relevantLines={FARRAGUT_WEST_INCIDENT_LINES}
        compact={compact}
      />
    </div>
  )
}
