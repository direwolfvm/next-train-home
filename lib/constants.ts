// Official WMATA line colors
export const LINE_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  BL: { bg: '#009CDE', text: '#ffffff', name: 'Blue' },
  YL: { bg: '#FFD100', text: '#000000', name: 'Yellow' },
  OR: { bg: '#ED8B00', text: '#ffffff', name: 'Orange' },
  SV: { bg: '#919D9D', text: '#ffffff', name: 'Silver' },
  RD: { bg: '#BF0D3E', text: '#ffffff', name: 'Red' },
  GR: { bg: '#00B140', text: '#ffffff', name: 'Green' },
}

// How many arrivals to show per direction
export const MAX_ARRIVALS = 4
