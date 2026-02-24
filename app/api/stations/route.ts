import { NextResponse } from 'next/server'
import { parseWmataJson } from '@/lib/wmata'

const WMATA_BASE = 'https://api.wmata.com/Rail.svc'

export async function GET() {
  const apiKey = process.env.WMATA_PRIMARY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${WMATA_BASE}/json/jStations`, {
      headers: { api_key: apiKey },
      next: { revalidate: 86400 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `WMATA API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = parseWmataJson(await res.text())
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  } catch (err) {
    console.error('Stations fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 })
  }
}
