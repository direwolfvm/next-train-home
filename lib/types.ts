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
