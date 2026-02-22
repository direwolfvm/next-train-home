/**
 * Windows-1252 special characters (0x80–0x9F byte range) map to Unicode
 * codepoints outside the Latin-1 range. This is the REVERSE lookup:
 * Unicode codepoint → original Windows-1252 byte value.
 *
 * All other chars with codepoint ≤ 0xFF are identical in Latin-1 and Win-1252
 * (byte value = codepoint), so they don't need an explicit entry.
 */
const WIN1252_REVERSE: Readonly<Record<number, number>> = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
}

/**
 * WMATA sends responses as UTF-8 but may declare the wrong charset.
 * Node.js / Next.js's patched fetch decodes the response body as Windows-1252,
 * corrupting multi-byte UTF-8 sequences (e.g. the right-single-quote ' arrives
 * as the three-char string "â€™").
 *
 * This function reverses the damage: maps each character back to its original
 * Windows-1252 byte value, then decodes the resulting bytes as UTF-8.
 *
 * Usage:
 *   const data = parseWmataJson(await res.text())
 */
export function parseWmataJson(text: string): unknown {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i)
    bytes[i] = WIN1252_REVERSE[cp] ?? (cp & 0xFF)
  }
  return JSON.parse(new TextDecoder('utf-8').decode(bytes))
}
