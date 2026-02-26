import { NextRequest, NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GtfsRealtimeBindings = require('gtfs-realtime-bindings')

const GTFS_RT_URL = 'https://api.wmata.com/gtfs/rail-gtfsrt-tripupdates.pb'

const ROUTE_TO_LINE: Record<string, string> = {
  BLUE: 'BL',
  RED: 'RD',
  GREEN: 'GR',
  ORANGE: 'OR',
  SILVER: 'SV',
  YELLOW: 'YL',
}

function toLong(val: unknown): number {
  if (val == null) return 0
  if (typeof val === 'number') return val
  // protobufjs Long object
  if (typeof (val as { toNumber?: () => number }).toNumber === 'function') {
    return (val as { toNumber: () => number }).toNumber()
  }
  return Number(val) || 0
}

// WMATA GTFS stop IDs are "PF_{stationCode}_{platform}" e.g. "PF_C13_C", "PF_C03_1"
// Extract the station code from the middle segment
function extractStationCode(stopId: string): string | null {
  const parts = stopId.split('_')
  if (parts.length >= 3 && parts[0] === 'PF') return parts[1]
  return null
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.WMATA_PRIMARY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const stationCodes = new Set(
    (request.nextUrl.searchParams.get('stations') ?? '').split(',').filter(Boolean)
  )
  if (stationCodes.size === 0) {
    return NextResponse.json({ error: 'stations parameter required' }, { status: 400 })
  }

  try {
    const res = await fetch(GTFS_RT_URL, {
      headers: { api_key: apiKey },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `WMATA GTFS-RT error: ${res.status}` },
        { status: res.status },
      )
    }

    const buffer = await res.arrayBuffer()
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer),
    )

    const now = Date.now() / 1000
    const arrivals: Array<{
      stationCode: string
      line: string
      directionId: number
      arrivalTime: number
      destinationCode: string | null
      tripId: string
    }> = []

    for (const entity of feed.entity ?? []) {
      const tu = entity.tripUpdate
      if (!tu?.trip) continue

      const line = ROUTE_TO_LINE[tu.trip.routeId ?? '']
      if (!line) continue

      const directionId = tu.trip.directionId ?? 0
      const tripId = tu.trip.tripId ?? ''

      const stus = tu.stopTimeUpdate ?? []
      // Last stop = destination (extract station code from GTFS stop ID)
      const lastStop = stus[stus.length - 1]
      const destinationCode = lastStop?.stopId ? extractStationCode(lastStop.stopId) : null

      for (const stu of stus) {
        const stopId = stu.stopId ?? ''
        const stationCode = extractStationCode(stopId)
        if (!stationCode || !stationCodes.has(stationCode)) continue

        const arrivalTime = toLong(stu.arrival?.time) || toLong(stu.departure?.time)
        if (arrivalTime <= now) continue

        arrivals.push({
          stationCode,
          line,
          directionId,
          arrivalTime,
          destinationCode,
          tripId,
        })
      }
    }

    return NextResponse.json({ arrivals })
  } catch (err) {
    console.error('GTFS-RT fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch GTFS-RT data' }, { status: 500 })
  }
}
