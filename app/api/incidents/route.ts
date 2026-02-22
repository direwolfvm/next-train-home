import { NextRequest, NextResponse } from 'next/server'

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

    // Force UTF-8 decoding regardless of the Content-Type charset declared by WMATA,
    // which sometimes advertises iso-8859-1 while actually sending UTF-8 bytes.
    const decodeJson = async (r: Response) => {
      const buf = await r.arrayBuffer()
      return JSON.parse(new TextDecoder('utf-8').decode(buf))
    }

    const incidentsData = incidentsRes.ok ? await decodeJson(incidentsRes) : { Incidents: [] }
    const elevatorData =
      elevatorRes && elevatorRes.ok ? await decodeJson(elevatorRes) : { ElevatorIncidents: [] }

    return NextResponse.json({
      Incidents: incidentsData.Incidents || [],
      ElevatorIncidents: elevatorData.ElevatorIncidents || [],
    })
  } catch (err) {
    console.error('Incidents fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
  }
}
