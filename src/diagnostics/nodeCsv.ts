import { readFile } from 'fs/promises'
import Papa from 'papaparse'

async function parseCsvFromFile(path: string): Promise<Record<string, string>[]> {
  const buf = await readFile(path)
  // Assume UTF-8; if data encoded differently, Node console may look garbled, but parsing still works on bytes
  const text = buf.toString('utf8')
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
  const rows = ((parsed as any).data || []).map((row: any) => {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) out[String(k || '').trim()] = String(v ?? '').trim()
    return out
  })
  return rows
}

export async function loadDriversCsvNode(root = '.'): Promise<Record<string, string>[]> {
  return parseCsvFromFile(`${root}/public/data/drivers.csv`)
}

export async function loadCitiesCsvNode(root = '.'): Promise<string[]> {
  const rows = await parseCsvFromFile(`${root}/public/data/cities.csv`)
  const header = rows.length ? Object.keys(rows[0]) : []
  const key = header.find((h) => ['city', 'город', 'label', 'City', 'Город'].includes(h)) || header[0]
  const names = rows.map((r) => (key ? r[key] : '')).filter(Boolean)
  return Array.from(new Set(names))
}

export async function loadLinePathsNode(root = '.'): Promise<string[][]> {
  const rows = await parseCsvFromFile(`${root}/public/data/line_paths.csv`)
  if (!rows.length) return []
  const headers = Object.keys(rows[0])
  const hasGrouped = ['line_id', 'variant_id', 'seq', 'city_id'].every((k) => headers.includes(k))
  if (hasGrouped) {
    const groups = new Map<string, { seq: number; city: string }[]>()
    for (const r of rows) {
      const key = `${r['line_id']}|${r['variant_id']}`
      const seq = Number(r['seq'] || '0')
      const city = String(r['city_id'] || '').trim()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push({ seq, city })
    }
    const chains: string[][] = []
    for (const arr of groups.values()) {
      arr.sort((a, b) => a.seq - b.seq)
      const chain = arr.map((x) => x.city).filter(Boolean)
      if (chain.length >= 2) chains.push(chain)
    }
    return chains
  }
  // Otherwise, expect first column contains a chain
  const col = headers[0]
  const chains: string[][] = []
  for (const r of rows) {
    const s = String(r[col] || '').trim()
    if (!s) continue
    const parts = s
      .replace(/\u00A0/g, ' ')
      // Do not split hyphenated city names; only treat en/em dashes or spaced hyphens as separators.
      .replace(/\s*[–—]\s*/g, ' — ')
      .replace(/\s-\s/g, ' — ')
      .split(' — ')
      .map((x) => x.trim())
      .filter(Boolean)
    if (parts.length >= 2) chains.push(parts)
  }
  return chains
}

