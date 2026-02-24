'use client'

import { TrainPrediction, RailIncident, ElevatorIncident, LineFrequencyStats, StationConfig } from '@/lib/types'
import { LINE_COLORS, MAX_ARRIVALS } from '@/lib/constants'
import { filterDirection } from '@/lib/trainFilter'
import TrainTable from './TrainTable'
import FrequencyPanel from './FrequencyPanel'
import IncidentsPanel from './IncidentsPanel'

interface StationBoardProps {
  config: StationConfig
  trains: TrainPrediction[]
  railIncidents: RailIncident[]
  elevatorIncidents: ElevatorIncident[]
  freqStatsByDirection: LineFrequencyStats[]  // parallel-indexed to config.directions
  lastUpdated: Date | null
  error: string | null
  compact?: boolean
}

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ${ampm}`
}

export default function StationBoard({
  config,
  trains,
  railIncidents,
  elevatorIncidents,
  freqStatsByDirection,
  lastUpdated,
  error,
  compact,
}: StationBoardProps) {
  // Unique lines across all directions for the header orbs
  const allLines = Array.from(new Set(config.directions.flatMap(d => d.lines)))

  // Relevant lines for incident filtering (flattened + deduped)
  const incidentLines = allLines.filter(l => l !== 'No' && l !== '')

  const multiDir = config.directions.length > 1

  return (
    <div className={compact ? 'space-y-2' : 'space-y-5'}>
      {/* Station header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {allLines.map(line => (
              <span
                key={line}
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: LINE_COLORS[line]?.bg ?? '#888' }}
              />
            ))}
            <span className="text-xs text-slate-500 uppercase tracking-widest ml-1">
              {allLines.map(l => LINE_COLORS[l]?.name ?? l).join(' · ')}
            </span>
          </div>
          <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-slate-100 leading-tight`}>
            {config.stationName}
          </h2>
          {!multiDir && config.directions[0] && (
            <p className="text-sm text-slate-500 mt-0.5">
              {config.directions[0].label} · {config.walkingMinutes} min walk
            </p>
          )}
          {multiDir && config.walkingMinutes > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {config.walkingMinutes} min walk
            </p>
          )}
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

      {/* Direction sections */}
      {config.directions.map((dir, i) => {
        const filteredTrains = filterDirection(trains, dir).slice(0, MAX_ARRIVALS)
        const dirFreqStats = freqStatsByDirection[i] ?? {}
        const accentColor = LINE_COLORS[dir.lines[0]]?.bg ?? '#888'
        const lineNames = dir.lines.map(l => LINE_COLORS[l]?.name ?? l).join(' · ')

        return (
          <div key={i}>
            {multiDir ? (
              <div className="rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"
                  style={{ borderLeftWidth: 3, borderLeftColor: accentColor, borderLeftStyle: 'solid' }}
                >
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    {dir.label}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-600">{lineNames}</span>
                </div>
                <div className="px-4 py-3">
                  <TrainTable
                    trains={filteredTrains}
                    walkingMinutes={config.walkingMinutes}
                    emptyMessage={`No ${dir.label.toLowerCase()} trains predicted`}
                    compact={compact}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-4 py-3">
                <TrainTable
                  trains={filteredTrains}
                  walkingMinutes={config.walkingMinutes}
                  emptyMessage={`No ${dir.label.toLowerCase()} trains predicted`}
                  compact={compact}
                />
              </div>
            )}

            <FrequencyPanel
              stats={dirFreqStats}
              label={multiDir ? `${dir.label} · Frequency` : `${dir.label} Frequency`}
              compact={compact}
            />
          </div>
        )
      })}

      {/* Incidents */}
      <IncidentsPanel
        railIncidents={railIncidents}
        elevatorIncidents={elevatorIncidents}
        relevantLines={incidentLines}
        compact={compact}
      />
    </div>
  )
}
