import Papa from 'papaparse'

export async function fetchCsv(path: string): Promise<Record<string, string>[]> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  const text = await res.text()
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  })
  if (parsed.errors?.length) {
    // still return rows, but log errors in console
    console.warn('CSV parse errors for', path, parsed.errors)
  }
  // Ensure strings only
  const rows = ((parsed as any).data || []).map((row: any) => {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) out[String(k || '').trim()] = String(v ?? '').trim()
    return out
  })
  return rows
}

export async function loadDriversCsv(): Promise<Record<string, string>[]> {
  return fetchCsv('/data/drivers.csv')
}

export async function loadCitiesCsv(): Promise<string[]> {
  const rows = await fetchCsv('/data/cities.csv')
  // Try common columns: 'city', 'Город', 'label'
  const header = rows.length ? Object.keys(rows[0]) : []
  const key = header.find((h) => ['city', 'город', 'label', 'City', 'Город'].includes(h)) || header[0]
  const names = rows.map((r) => (key ? r[key] : '')).filter(Boolean)
  // Deduplicate
  return Array.from(new Set(names))
}

export async function loadLinePaths(): Promise<string[][]> {
  const rows = await fetchCsv('/data/line_paths.csv')
  if (!rows.length) return []
  const headers = Object.keys(rows[0])
  const hasGrouped = ['line_id', 'variant_id', 'seq', 'city_id'].every((k) => headers.includes(k))
  if (hasGrouped) {
    // Group by line_id + variant_id, order by seq
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
  // Otherwise, expect rows have a single column with chain string
  const col = headers[0]
  const chains: string[][] = []
  for (const r of rows) {
    const s = String(r[col] || '').trim()
    if (!s) continue
    // split by em-dash like in drivers
    const parts = s
      .replace(/\u00A0/g, ' ')
      .replace(/\s*[\-–—‑]\s*/g, ' — ')
      .split(' — ')
      .map((x) => x.trim())
      .filter(Boolean)
    if (parts.length >= 2) chains.push(parts)
  }
  return chains
}
