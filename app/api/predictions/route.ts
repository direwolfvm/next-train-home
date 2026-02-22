import { NextRequest, NextResponse } from 'next/server'
import { parseWmataJson } from '@/lib/wmata'

const WMATA_BASE = 'https://api.wmata.com/StationPrediction.svc'

export async function GET(request: NextRequest) {
  const apiKey = process.env.WMATA_PRIMARY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const stations = searchParams.get('stations')
  if (!stations) {
    return NextResponse.json({ error: 'stations parameter required' }, { status: 400 })
  }

  try {
    const url = `${WMATA_BASE}/json/GetPrediction/${encodeURIComponent(stations)}`
    const res = await fetch(url, {
      headers: { api_key: apiKey },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `WMATA API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = parseWmataJson(await res.text())
    return NextResponse.json(data)
  } catch (err) {
    console.error('Predictions fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }
}
