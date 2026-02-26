export type LineCode = 'BL' | 'YL' | 'OR' | 'SV' | 'RD' | 'GR' | 'No' | ''

export interface TrainPrediction {
  Car: string | null
  Destination: string
  DestinationCode: string | null
  DestinationName: string
  Group: string
  Line: LineCode
  LocationCode: string
  LocationName: string
  Min: string // numeric, "ARR", "BRD", "---", or ""
}

export interface RailIncident {
  DateUpdated: string
  Description: string
  IncidentID: string
  IncidentType: string
  LinesAffected: string // "BL; YL; " format
}

export interface ElevatorIncident {
  DateOutOfServ: string
  DateUpdated: string
  EstimatedReturnToService: string | null
  LocationDescription: string
  StationCode: string
  StationName: string
  SymptomDescription: string
  UnitName: string
  UnitType: 'ELEVATOR' | 'ESCALATOR'
}

export interface FrequencySnapshot {
  timestamp: number
  averageIntervalMinutes: number
}

export type FrequencyTrend = 'improving' | 'worsening' | 'stable' | 'unknown'

export interface FrequencyStats {
  currentAvgMinutes: number | null
  trend: FrequencyTrend
  sampleCount: number
}

export type Station = 'home' | 'work'

// Map of line code → frequency stats, e.g. { BL: {...}, YL: {...} }
export type LineFrequencyStats = Record<string, FrequencyStats>

// Settings types

export interface DirectionConfig {
  group: '1' | '2'   // WMATA Group field value
  lines: LineCode[]   // which lines to show in this direction
  label: string       // user-visible section header, e.g. "Northbound"
}

export interface StationConfig {
  stationCode: string       // WMATA 3-char code, e.g. 'C13'
  stationName: string       // display name, e.g. 'King Street–Old Town'
  walkingMinutes: number
  directions: DirectionConfig[]   // 1 or 2 entries
}

export interface UserSettings {
  home: StationConfig
  work: StationConfig
}

// GTFS-RT arrival from trip updates feed
export interface GtfsArrival {
  stationCode: string
  line: string           // "BL", "YL", etc. (mapped from route_id)
  directionId: number    // 0 or 1
  arrivalTime: number    // Unix timestamp in seconds
  destinationCode: string | null
  tripId: string
}

// Shape of a station entry from WMATA /Rail.svc/json/jStations
export interface WmataStation {
  Code: string
  Name: string
  LineCode1: string
  LineCode2: string | null
  LineCode3: string | null
  LineCode4: string | null
}
