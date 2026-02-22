import { NextRequest, NextResponse } from 'next/server'
import { parseWmataJson } from '@/lib/wmata'

const WMATA_BASE = 'https://api.wmata.com/Incidents.svc'

export async function GET(request: NextRequest) {
  const apiKey = process.env.WMATA_PRIMARY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const stationCode = searchParams.get('stationCode')

  try {
    // Fetch rail incidents (system-wide, we filter client-side by line)
    const [incidentsRes, elevatorRes] = await Promise.all([
      fetch(`${WMATA_BASE}/json/Incidents`, {
        headers: { api_key: apiKey },
        next: { revalidate: 0 },
      }),
      stationCode
        ? fetch(`${WMATA_BASE}/json/ElevatorIncidents?StationCode=${stationCode}`, {
            headers: { api_key: apiKey },
            next: { revalidate: 0 },
          })
        : Promise.resolve(null),
    ])

    const decodeJson = async (r: Response) => parseWmataJson(await r.text())

    const incidentsData = incidentsRes.ok ? await decodeJson(incidentsRes) : { Incidents: [] }
    const elevatorData =
      elevatorRes && elevatorRes.ok ? await decodeJson(elevatorRes) : { ElevatorIncidents: [] }

    return NextResponse.json({
      Incidents: (incidentsData as Record<string, unknown>).Incidents || [],
      ElevatorIncidents: (elevatorData as Record<string, unknown>).ElevatorIncidents || [],
    })
  } catch (err) {
    console.error('Incidents fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
  }
}
