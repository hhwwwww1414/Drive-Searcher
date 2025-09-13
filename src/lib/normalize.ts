// Normalization helpers for cities and strings

const emDash = '—'

// Aliases map (expandable)
const aliasMap: Record<string, string> = {
  'спб': 'санкт-петербург',
  'питер': 'санкт-петербург',
  'когалым': 'сургут',
  'ачинск': 'красноярск',
  'самара': 'тольятти',
  'ставрополь': 'армавир',
}

export function normalizeDashSeparators(s: string): string {
  if (!s) return ''
  let t = s
  // unify nbsp
  t = t.replace(/\u00A0/g, ' ')
  // replace various dashes between tokens with spaced em dash
  t = t.replace(/\s*[\-–—‑]\s*/g, ` ${emDash} `)
  // collapse spaces
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

export function normalizeCity(raw: string): string {
  let t = normalizeDashSeparators(raw)
  // drop garbage tokens
  if (!t) return ''
  t = t.replace(/^\s*nan\s*$/i, '')
  // remove standalone em dash tokens
  if (t === emDash) return ''
  // lowercase for alias match
  const lower = t.toLowerCase()
  const aliased = aliasMap[lower] || lower
  // capitalize first letter of each segment separated by space
  return aliased
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function extractPhoneAndName(raw: string): { name: string; phone: string; rawName: string } {
  const phoneMatch = raw?.match(/\+7\d{10}/)
  const phone = phoneMatch ? phoneMatch[0] : ''
  const name = raw ? raw.replace(/\+7\d{10}/, '').trim() : ''
  return { name, phone, rawName: raw || '' }
}

// Split a chain string by spaced em dash only: "A — B — C"
export function splitChain(chain: string): string[] {
  const cleaned = normalizeDashSeparators(chain)
  if (!cleaned) return []
  // split only by em dash (spaced or unspaced after normalization) with spaces
  const parts = cleaned.split(` ${emDash} `)
  return parts.map((p) => normalizeCity(p)).filter((p) => p && p !== '…')
}

// Split top-level variants by single '|' while preserving '||' as part of tokens
export function splitVariantsTop(s: string): string[] {
  const out: string[] = []
  let buf = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '|') {
      if (i + 1 < s.length && s[i + 1] === '|') {
        buf += '||'
        i += 1
      } else {
        const trimmed = buf.trim()
        if (trimmed) out.push(trimmed)
        buf = ''
      }
    } else {
      buf += ch
    }
  }
  const trimmed = buf.trim()
  if (trimmed) out.push(trimmed)
  return out
}

// Expand alternatives in a chain containing tokens with "||" alternatives
// Example: "А — B1 || B2 — C" -> [[A,B1,C],[A,B2,C]]
export function expandAlternatives(chain: string): string[][] {
  const tokens = splitChain(chain)
  if (!tokens.length) return []
  const altTokens = tokens.map((tok) => tok.split('||').map((t) => normalizeCity(t.trim())).filter(Boolean))
  // Cartesian product
  let acc: string[][] = [[]]
  for (const alts of altTokens) {
    const next: string[][] = []
    for (const base of acc) {
      for (const alt of alts) next.push([...base, alt])
    }
    acc = next
  }
  return acc
}

// Split pairs list from history by ; or |
export function splitPairsList(s: string): [string, string][] {
  if (!s) return []
  const unified = s.replace(/;/g, '|')
  const items = unified.split('|').map((x) => x.trim()).filter(Boolean)
  const pairs: [string, string][] = []
  for (const item of items) {
    const [a, b] = splitChain(item)
    if (a && b) pairs.push([a, b])
  }
  return pairs
}

// Split list fields (branches/corridors) by ; or |
export function splitList(s: string): string[] {
  if (!s) return []
  return s
    .replace(/;/g, '|')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
}
