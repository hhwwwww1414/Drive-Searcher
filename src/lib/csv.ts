import Papa from 'papaparse'
import { CityRating, RouteRating, DriverRating } from './types'

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

function stripBomRows(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) out[k.replace(/\ufeff/g, '')] = v
    return out
  })
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
      // Keep hyphenated city names intact (e.g., "Горно-Алтайск").
      // Convert only en/em dashes, or spaced hyphens, into a spaced em dash separator.
      .replace(/\s*[–—]\s*/g, ' — ')
      .replace(/\s-\s/g, ' — ')
      .split(' — ')
      .map((x) => x.trim())
      .filter(Boolean)
    if (parts.length >= 2) chains.push(parts)
  }
  return chains
}

export async function loadCityRatings(): Promise<CityRating[]> {
  const rows = stripBomRows(await fetchCsv('/data/city_ratings.csv'))
  return rows.map((r) => ({
    city: r['City'] || r['Город'] || '',
    rating: Number(r['Rating'] || r['Рейтинг'] || '0'),
    dealsStarted: Number(r['Deals started'] || r['Сделок началось'] || '0'),
    dealsFinished: Number(r['Deals finished'] || r['Сделок завершилось'] || '0'),
    bidsStart: Number(r['Bids sum (start)'] || r['Сумма ставок (старт)'] || '0'),
    bidsFinish: Number(r['Bids sum (finish)'] || r['Сумма ставок (финиш)'] || '0'),
    bidsTotal: Number(r['Total bid volume'] || r['Общий объём (ставка)'] || '0'),
    routes: Number(r['Routes through city'] || r['Маршрутов через город'] || '0'),
    fleetDensity: Number(r['Fleet density'] || r['Плотность водительского парка'] || '0'),
    avgBid:
      Number(
        r['Average bid (city deals)'] ||
          r['Average bid'] ||
          r['Средняя ставка (по сделкам города)'] ||
          '0'
      ),
  }))
}

export async function loadRouteRatings(): Promise<RouteRating[]> {
  const rows = stripBomRows(await fetchCsv('/data/route_ratings.csv'))
  return rows.map((r) => ({
    route: r['Маршрут'] || r['Маршрут (A — B)'] || '',
    trips: Number(
      r['Trips'] ||
        r['Рейсов'] ||
        r['Количество сделок по маршруту'] ||
        r['Сделок'] ||
        '0'
    ),
    bidsSum: Number(
      r['Bids sum'] || r['Сумма ставок по маршруту'] || r['Сумма ставок'] || '0'
    ),
    avgBid: Number(r['Average bid'] || r['Средняя ставка'] || '0'),
    drivers: Number(
      r['Drivers'] ||
        r['Водителей'] ||
        r['Количество уникальных водителей'] ||
        r['Водителей (уникальных)'] ||
        '0'
    ),
  }))
}

export async function loadDriverRatings(): Promise<DriverRating[]> {
  const rows = stripBomRows(await fetchCsv('/data/driver_ratings.csv'))
  return rows.map((r) => ({
    name: r['ФИО'] || r['Name'] || '',
    phone: r['ТЕЛЕФОН'] || r['Phone'] || '',
    deals: Number(r['Количество сделок'] || r['Deals'] || '0'),
    bidsSum: Number(r['Общая сумма'] || r['Bids sum'] || '0'),
    uniqueRoutes: Number(
      r['Доступные маршруты'] || r['Routes'] || r['Уникальных маршрутов'] || '0'
    ),
  }))
}
