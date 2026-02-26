import { TrainPrediction, FrequencySnapshot, FrequencyStats, FrequencyTrend, GtfsArrival, DirectionConfig } from './types'

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
    return { currentAvgMinutes: null, scheduledAvgMinutes: null, trend: 'unknown', sampleCount: 0 }
  }

  // Use the most recent snapshot as current frequency
  const latest = snapshots[snapshots.length - 1]
  const trend = calcTrend(snapshots)

  return {
    currentAvgMinutes: Math.round(latest.averageIntervalMinutes * 10) / 10,
    scheduledAvgMinutes: null,
    trend,
    sampleCount: snapshots.length,
  }
}

/**
 * Calculate scheduled frequency per line from GTFS-RT arrival timestamps.
 * Returns avg gap (in minutes) between consecutive arrivals for each line.
 */
export function calcScheduledFrequency(
  gtfsArrivals: GtfsArrival[],
  dir: DirectionConfig,
): Record<string, number | null> {
  const now = Date.now() / 1000
  const directionId = dir.group === '1' ? 0 : 1

  // Filter to matching direction + lines + future arrivals
  const matching = gtfsArrivals.filter(a =>
    (dir.lines as string[]).includes(a.line) &&
    a.directionId === directionId &&
    a.arrivalTime > now
  )

  // Group by line
  const byLine: Record<string, number[]> = {}
  for (const a of matching) {
    if (!byLine[a.line]) byLine[a.line] = []
    byLine[a.line].push(a.arrivalTime)
  }

  // Compute avg gap per line
  const result: Record<string, number | null> = {}
  for (const line of dir.lines) {
    const times = byLine[line]
    if (!times || times.length < 2) {
      result[line] = null
      continue
    }
    times.sort((a, b) => a - b)
    let totalGap = 0
    for (let i = 1; i < times.length; i++) {
      totalGap += times[i] - times[i - 1]
    }
    const avgMinutes = totalGap / (times.length - 1) / 60
    result[line] = Math.round(avgMinutes * 10) / 10
  }

  return result
}
