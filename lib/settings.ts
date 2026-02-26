import { UserSettings, StationConfig } from './types'

const SETTINGS_KEY = 'nexttrainhome_settings_v1'

export const DEFAULT_HOME_STATION: StationConfig = {
  stationCode: 'C13',
  stationName: 'King Street-Old Town',
  walkingMinutes: 6,
  directions: [
    { group: '1', lines: ['BL', 'YL'], label: 'Northbound' },
  ],
}

export const DEFAULT_WORK_STATION: StationConfig = {
  stationCode: 'C03',
  stationName: 'Farragut West',
  walkingMinutes: 6,
  directions: [
    { group: '2', lines: ['BL'], label: 'To Virginia' },
    { group: '1', lines: ['BL', 'OR', 'SV'], label: 'To Largo / New Carrollton' },
  ],
}

export const DEFAULT_SETTINGS: UserSettings = {
  home: DEFAULT_HOME_STATION,
  work: DEFAULT_WORK_STATION,
}

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as UserSettings
    if (!parsed.home?.stationCode || !parsed.work?.stationCode) return DEFAULT_SETTINGS
    return parsed
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
