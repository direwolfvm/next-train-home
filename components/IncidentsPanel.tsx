'use client'

import { useEffect, useRef, useState } from 'react'
import { RailIncident, ElevatorIncident } from '@/lib/types'

interface IncidentsPanelProps {
  railIncidents: RailIncident[]
  elevatorIncidents: ElevatorIncident[]
  relevantLines: string[]
  compact?: boolean
}

function parseLinesAffected(linesAffected: string): string[] {
  return linesAffected
    .split(/;\s?/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
}

type AlertItem =
  | { kind: 'rail';     inc: RailIncident;     id: string }
  | { kind: 'elevator'; inc: ElevatorIncident; id: string }

// How long each alert stays visible before the carousel advances (ms)
const CAROUSEL_MS = 8_000
// Fixed height of the alert pane in pixels — must match the inline style below
const PANE_PX = 88

function AlertContent({ alert }: { alert: AlertItem }) {
  if (alert.kind === 'rail') {
    const inc = alert.inc
    return (
      <div className="flex items-start gap-2">
        <span className="text-rose-600 dark:text-rose-400 text-sm mt-0.5 shrink-0">⚠</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
              {inc.IncidentType}
            </span>
            <span className="text-xs text-slate-500">
              {parseLinesAffected(inc.LinesAffected).join(', ')}
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{inc.Description}</p>
        </div>
      </div>
    )
  }

  const inc = alert.inc
  return (
    <div className="flex items-start gap-2">
      <span className="text-amber-600 dark:text-amber-400 text-sm mt-0.5 shrink-0">
        {inc.UnitType === 'ELEVATOR' ? '🛗' : '↕'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            {inc.UnitType}
          </span>
          <span className="text-xs text-slate-500">{inc.UnitName}</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
          {inc.LocationDescription} — {inc.SymptomDescription}
        </p>
      </div>
    </div>
  )
}

/**
 * Fixed-height clipping pane. If the content is taller than PANE_PX, it
 * automatically scrolls down then back up using a CSS keyframe animation
 * driven by a --scroll-overflow custom property set inline.
 *
 * Each alert renders as a fresh instance (via React key) so the animation
 * always resets from the top when the carousel advances.
 */
function AlertPane({ alert }: { alert: AlertItem }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(0)

  useEffect(() => {
    if (!innerRef.current || !outerRef.current) return
    const o = innerRef.current.scrollHeight - outerRef.current.clientHeight
    setOverflow(Math.max(0, o))
  }, []) // intentionally empty — component is remounted on each alert change

  // Scroll occupies 60 % of the cycle; pauses at top/bottom take the remaining 40 %.
  // Target scroll speed ~25 px / s.
  const totalSec = overflow > 0 ? Math.max(5, (overflow / 25) / 0.6) : 0

  return (
    <div ref={outerRef} className="overflow-hidden" style={{ height: PANE_PX }}>
      <div
        ref={innerRef}
        style={overflow > 0 ? ({
          '--scroll-overflow': `-${overflow}px`,
          animationName: 'panelScroll',
          animationDuration: `${totalSec.toFixed(1)}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
          animationDelay: '1.5s',
        } as React.CSSProperties) : undefined}
      >
        <AlertContent alert={alert} />
      </div>
    </div>
  )
}

export default function IncidentsPanel({
  railIncidents,
  elevatorIncidents,
  relevantLines,
  compact,
}: IncidentsPanelProps) {
  const filteredRail = railIncidents.filter(inc => {
    const lines = parseLinesAffected(inc.LinesAffected)
    return lines.some(l => relevantLines.includes(l))
  })

  const alerts: AlertItem[] = [
    ...filteredRail.map(inc => ({ kind: 'rail' as const, inc, id: inc.IncidentID })),
    ...elevatorIncidents.slice(0, 3).map(inc => ({
      kind: 'elevator' as const,
      inc,
      id: inc.UnitName,
    })),
  ]

  const [index, setIndex] = useState(0)
  const safeIndex = alerts.length > 0 ? index % alerts.length : 0

  // Reset to first alert whenever the list length changes
  useEffect(() => { setIndex(0) }, [alerts.length])

  // Auto-advance carousel
  useEffect(() => {
    if (alerts.length <= 1) return
    const t = setInterval(() => setIndex(i => (i + 1) % alerts.length), CAROUSEL_MS)
    return () => clearInterval(t)
  }, [alerts.length])

  const current = alerts[safeIndex]
  const isRail = current?.kind === 'rail'
  const cardPad = compact ? 'py-2 px-3' : 'py-3 px-4'

  return (
    <div className="space-y-2">
      {/* Section label + counter */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 uppercase tracking-widest">Alerts & Outages</p>
        {alerts.length > 1 && (
          <span className="text-xs text-slate-400 dark:text-slate-600 tabular-nums">
            {safeIndex + 1} / {alerts.length}
          </span>
        )}
      </div>

      {/* Alert pane or empty state */}
      {alerts.length === 0 ? (
        <div className={`flex items-center gap-2 ${compact ? 'py-1.5 px-3' : 'py-2.5 px-4'} rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800`}>
          <span className="text-emerald-600 dark:text-emerald-500 text-sm">●</span>
          <span className="text-slate-600 dark:text-slate-400 text-sm">No active alerts</span>
        </div>
      ) : (
        <div
          className={`${cardPad} rounded-lg border ${
            isRail
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
          }`}
        >
          {/* key forces remount (and animation reset) on each carousel step */}
          <AlertPane key={current.id} alert={current} />
        </div>
      )}

      {/* Dot indicators — clickable to jump to a specific alert */}
      {alerts.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {alerts.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === safeIndex ? 'bg-slate-500 dark:bg-slate-400' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
