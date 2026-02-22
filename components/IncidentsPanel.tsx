'use client'

import { RailIncident, ElevatorIncident } from '@/lib/types'

interface IncidentsPanelProps {
  railIncidents: RailIncident[]
  elevatorIncidents: ElevatorIncident[]
  relevantLines: string[]
}

function parseLinesAffected(linesAffected: string): string[] {
  return linesAffected
    .split(/;\s?/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
}

export default function IncidentsPanel({
  railIncidents,
  elevatorIncidents,
  relevantLines,
}: IncidentsPanelProps) {
  const filteredRail = railIncidents.filter(inc => {
    const lines = parseLinesAffected(inc.LinesAffected)
    return lines.some(l => relevantLines.includes(l))
  })

  const filteredElevator = elevatorIncidents.slice(0, 3)

  const hasIncidents = filteredRail.length > 0 || filteredElevator.length > 0

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 uppercase tracking-widest">Alerts & Outages</p>

      {!hasIncidents && (
        <div className="flex items-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800/40 border border-slate-800">
          <span className="text-emerald-500 text-sm">●</span>
          <span className="text-slate-400 text-sm">No active alerts</span>
        </div>
      )}

      {filteredRail.map(inc => (
        <div
          key={inc.IncidentID}
          className="py-2.5 px-4 rounded-lg bg-rose-950/30 border border-rose-900/50"
        >
          <div className="flex items-start gap-2">
            <span className="text-rose-400 text-sm mt-0.5 shrink-0">⚠</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wide">
                  {inc.IncidentType}
                </span>
                <span className="text-xs text-slate-500">
                  {parseLinesAffected(inc.LinesAffected).join(', ')}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-snug">{inc.Description}</p>
            </div>
          </div>
        </div>
      ))}

      {filteredElevator.map(inc => (
        <div
          key={inc.UnitName}
          className="py-2.5 px-4 rounded-lg bg-amber-950/30 border border-amber-900/50"
        >
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-sm mt-0.5 shrink-0">
              {inc.UnitType === 'ELEVATOR' ? '🛗' : '↕'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  {inc.UnitType}
                </span>
                <span className="text-xs text-slate-500">{inc.UnitName}</span>
              </div>
              <p className="text-sm text-slate-300 leading-snug">
                {inc.LocationDescription} — {inc.SymptomDescription}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
