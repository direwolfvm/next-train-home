'use client'

import { LineFrequencyStats } from '@/lib/types'
import { LINE_COLORS } from '@/lib/constants'

interface FrequencyPanelProps {
  stats: LineFrequencyStats
  label?: string
}

const TREND_CONFIG = {
  improving: { icon: '↓', label: 'improving', color: 'text-emerald-400' },
  worsening: { icon: '↑', label: 'worsening', color: 'text-rose-400' },
  stable: { icon: '→', label: 'stable', color: 'text-slate-400' },
  unknown: { icon: '·', label: 'estimating…', color: 'text-slate-500' },
}

export default function FrequencyPanel({ stats, label }: FrequencyPanelProps) {
  const entries = Object.entries(stats)

  return (
    <div className="py-3 px-4 rounded-lg bg-slate-800/40 border border-slate-800">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2.5">
        {label ?? 'Train Frequency'}
      </p>

      {entries.length === 0 ? (
        <p className="text-slate-600 text-sm font-mono">Estimating…</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([line, s]) => {
            const colors = LINE_COLORS[line] ?? { bg: '#555', text: '#fff' }
            const cfg = TREND_CONFIG[s.trend]
            return (
              <div key={line} className="flex items-center gap-2.5">
                {/* Line badge */}
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {line}
                </span>

                {/* Interval */}
                <span className="font-mono text-sm font-semibold text-slate-100 w-16 tabular-nums">
                  {s.currentAvgMinutes != null ? `~${s.currentAvgMinutes} min` : '—'}
                </span>

                {/* Trend icon + label */}
                <span className={`text-sm font-bold ${cfg.color}`}>{cfg.icon}</span>
                <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>

                {/* Sample count */}
                {s.sampleCount > 0 && (
                  <span className="text-xs text-slate-700 ml-auto tabular-nums">
                    {s.sampleCount} samples
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
