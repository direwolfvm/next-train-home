'use client'

import { TrainPrediction } from '@/lib/types'
import LineIndicator from './LineIndicator'

interface TrainTableProps {
  trains: TrainPrediction[]
  walkingMinutes: number
  emptyMessage?: string
  compact?: boolean
}

function formatMinutes(min: string): { display: string; urgency: 'normal' | 'soon' | 'now' } {
  if (min === 'ARR' || min === 'BRD') return { display: min, urgency: 'now' }
  if (min === '---' || min === '' || min === null) return { display: '---', urgency: 'normal' }
  const n = parseInt(min, 10)
  if (isNaN(n)) return { display: min, urgency: 'normal' }
  if (n <= 1) return { display: `${n} min`, urgency: 'now' }
  if (n <= 3) return { display: `${n} min`, urgency: 'soon' }
  return { display: `${n} min`, urgency: 'normal' }
}

interface LeaveByResult {
  missed: boolean   // train is no longer catchable given walking time
  display: string   // empty string when missed
  urgent: boolean
}

function formatLeaveBy(min: string, walkingMinutes: number): LeaveByResult {
  // Train is at the station right now
  if (min === 'ARR' || min === 'BRD') {
    if (walkingMinutes > 0) return { missed: true, display: '', urgent: false }
    return { missed: false, display: min, urgent: true }
  }

  if (min === '---' || min === '' || min === null) {
    return { missed: false, display: '---', urgent: false }
  }

  const n = parseInt(min, 10)
  if (isNaN(n)) return { missed: false, display: '---', urgent: false }

  const minutesToLeave = n - walkingMinutes

  // Already past — nothing useful to show
  if (minutesToLeave < 0) return { missed: true, display: '', urgent: false }

  const leaveAt = new Date(Date.now() + minutesToLeave * 60 * 1000)
  const h = leaveAt.getHours()
  const m = leaveAt.getMinutes()
  const timeStr = `${h % 12 || 12}:${m.toString().padStart(2, '0')}`

  const minLabel = minutesToLeave === 0 ? 'now' : `${minutesToLeave} min`
  return {
    missed: false,
    display: `${timeStr} (${minLabel})`,
    urgent: minutesToLeave <= 2,
  }
}

function formatCars(car: string | null): string {
  if (!car || car === '-') return '—'
  return car
}

export default function TrainTable({ trains, walkingMinutes, emptyMessage, compact }: TrainTableProps) {
  if (trains.length === 0) {
    return (
      <div className={`${compact ? 'py-2' : 'py-6'} text-center text-slate-500 text-sm`}>
        {emptyMessage ?? 'No predictions available'}
      </div>
    )
  }

  const rowPy = compact ? 'py-1.5' : 'py-3'
  const headPb = compact ? 'pb-1' : 'pb-2'

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-slate-800">
            <th className={`${headPb} text-left font-medium w-12`}>Line</th>
            <th className={`${headPb} text-left font-medium`}>Destination</th>
            <th className={`${headPb} text-center font-medium w-12`}>Cars</th>
            <th className={`${headPb} text-right font-medium w-20`}>Arrives</th>
            <th className={`${headPb} text-right font-medium w-32`}>
              {walkingMinutes > 0 ? 'Leave By' : 'Arrives At'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
          {trains.map((train, idx) => {
            const mins = formatMinutes(train.Min)
            const leave = formatLeaveBy(train.Min, walkingMinutes)
            const missed = leave.missed

            return (
              <tr
                key={idx}
                className={`group transition-colors ${
                  missed
                    ? 'opacity-35'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/30'
                }`}
              >
                <td className={`${rowPy} pr-3`}>
                  <LineIndicator line={train.Line} />
                </td>
                <td className={`${rowPy} pr-4`}>
                  <span className={missed ? 'text-slate-400 font-medium' : 'text-slate-900 dark:text-slate-100 font-medium'}>
                    {train.DestinationName || train.Destination}
                  </span>
                  {train.scheduled && (
                    <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                      sched
                    </span>
                  )}
                </td>
                <td className={`${rowPy} text-center font-mono text-slate-500 dark:text-slate-400`}>
                  {formatCars(train.Car)}
                </td>
                <td className={`${rowPy} text-right font-mono`}>
                  <span
                    className={
                      missed
                        ? 'text-slate-400'
                        : mins.urgency === 'now'
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : mins.urgency === 'soon'
                        ? 'text-amber-500 dark:text-amber-300'
                        : 'text-slate-800 dark:text-slate-200'
                    }
                  >
                    {mins.display}
                  </span>
                </td>
                <td className={`${rowPy} text-right font-mono`}>
                  {!missed && (
                    <span
                      className={
                        leave.urgent
                          ? 'text-rose-600 dark:text-rose-400 font-bold animate-pulse-slow'
                          : 'text-slate-700 dark:text-slate-300'
                      }
                    >
                      {leave.display}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
