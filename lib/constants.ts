import { LineCode } from './types'

// WMATA Station Codes
export const STATION_CODES = {
  KING_STREET: 'C13',       // King Street-Old Town (Blue/Yellow shared)
  FARRAGUT_WEST: 'C03',     // Farragut West (Blue/Orange/Silver)
} as const

// Walking time in minutes from each station
export const WALKING_MINUTES = {
  KING_STREET: 6,
  FARRAGUT_WEST: 0,
} as const

// Official WMATA line colors
export const LINE_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  BL: { bg: '#009CDE', text: '#ffffff', name: 'Blue' },
  YL: { bg: '#FFD100', text: '#000000', name: 'Yellow' },
  OR: { bg: '#ED8B00', text: '#ffffff', name: 'Orange' },
  SV: { bg: '#919D9D', text: '#ffffff', name: 'Silver' },
  RD: { bg: '#BF0D3E', text: '#ffffff', name: 'Red' },
  GR: { bg: '#00B140', text: '#ffffff', name: 'Green' },
}

// King Street: northbound = heading toward DC/Maryland (away from VA terminals)
// Primary filter is Group === '2' (southbound) in filterNorthbound().
// These codes are a fallback for cases where Group is absent or wrong.
export const KING_STREET_VA_TERMINALS = new Set([
  'J03', // Franconia-Springfield (Blue southbound terminus)
  'J02', // Van Dorn Street (Blue short-turn)
  'C15', // Huntington (Yellow southbound terminus)
  'C14', // Eisenhower Avenue (Yellow short-turn)
])

// Farragut West: VA-bound destinations (westbound)
export const FARRAGUT_VA_TERMINALS = new Set([
  // Blue Line VA
  'J03', // Franconia-Springfield
  'J02', // Van Dorn Street
  'C13', // King Street (short-turn Blue)
  'C12', // Braddock Road
  // Orange Line VA
  'A16', // Vienna/Fairfax-GMU
  'A14', // Dunn Loring-Merrifield
  'A13', // West Falls Church-VT/UVA
  // Silver Line VA
  'N12', // Ashburn
  'N09', // Washington Dulles International Airport
  'N06', // Wiehle-Reston East
  'N04', // Spring Hill
  'N03', // Greensboro
  'N02', // Tysons
  'N01', // McLean
])

// Lines we care about for each station
export const KING_STREET_LINES = new Set<LineCode>(['BL', 'YL'])
export const FARRAGUT_WEST_LINES = new Set<LineCode>(['BL', 'OR', 'SV'])

// Lines relevant for incident filtering
export const KING_STREET_INCIDENT_LINES = ['BL', 'YL']
export const FARRAGUT_WEST_INCIDENT_LINES = ['BL', 'OR', 'SV']

// How many arrivals to show
export const MAX_ARRIVALS = 4
