import { TrainPrediction, FrequencySnapshot, FrequencyStats, FrequencyTrend } from './types'

const WINDOW_MS = 90 * 60 * 1000  // 90 minutes
const HALF_WINDOW_MS = 45 * 60 * 1000  // 45 minutes

/**
 * Calculate the average interval (in minutes) between consecutive trains
 * based on the current prediction data.
 */
export function calcInstantFrequency(trains: TrainPrediction[]): number | null {
  const numericMins = trains
    .map(t => parseInt(t.Min, 10))
    .filter(m => !isNaN(m) && m >= 0)
    .sort((a, b) => a - b)

  if (numericMins.length < 2) return null

  const gaps: number[] = []
  for (let i = 1; i < numericMins.length; i++) {
    gaps.push(numericMins[i] - numericMins[i - 1])
  }

  return gaps.reduce((a, b) => a + b, 0) / gaps.length
}

/**
 * Add a frequency snapshot and prune old snapshots beyond the 90-minute window.
 */
export function addSnapshot(
  snapshots: FrequencySnapshot[],
  avgMinutes: number
): FrequencySnapshot[] {
  const now = Date.now()
  const cutoff = now - WINDOW_MS

  const pruned = snapshots.filter(s => s.timestamp >= cutoff)
  pruned.push({ timestamp: now, averageIntervalMinutes: avgMinutes })
  return pruned
}

/**
 * Calculate frequency trend by comparing first half vs second half of the window.
 * "Improving" means trains are coming more frequently (interval decreasing).
 */
export function calcTrend(snapshots: FrequencySnapshot[]): FrequencyTrend {
  const now = Date.now()
  const midpoint = now - HALF_WINDOW_MS
  const cutoff = now - WINDOW_MS

  const recent = snapshots.filter(s => s.timestamp >= midpoint)
  const older = snapshots.filter(s => s.timestamp >= cutoff && s.timestamp < midpoint)

  if (recent.length < 3 || older.length < 3) return 'unknown'

  const avg = (arr: FrequencySnapshot[]) =>
    arr.reduce((sum, s) => sum + s.averageIntervalMinutes, 0) / arr.length

  const recentAvg = avg(recent)
  const olderAvg = avg(older)
  const diff = recentAvg - olderAvg

  if (diff < -0.75) return 'improving'  // trains more frequent
  if (diff > 0.75) return 'worsening'   // trains less frequent
  return 'stable'
}

/**
 * Derive FrequencyStats from a list of snapshots.
 */
export function deriveFrequencyStats(snapshots: FrequencySnapshot[]): FrequencyStats {
  if (snapshots.length === 0) {
    return { currentAvgMinutes: null, trend: 'unknown', sampleCount: 0 }
  }

  // Use the most recent snapshot as current frequency
  const latest = snapshots[snapshots.length - 1]
  const trend = calcTrend(snapshots)

  return {
    currentAvgMinutes: Math.round(latest.averageIntervalMinutes * 10) / 10,
    trend,
    sampleCount: snapshots.length,
  }
}
