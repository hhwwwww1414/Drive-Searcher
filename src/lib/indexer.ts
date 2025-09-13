import { Driver, DriverRow, Indices } from './types'
import { extractPhoneAndName, expandAlternatives, normalizeCity, splitList, splitPairsList, splitVariantsTop } from './normalize'

const COLS = {
  CARRIER: 'Перевозчик',
  HISTORY: 'Маршруты из истории',
  CHAINS: 'Города (детализация)',
  BRANCHES: 'Ветки (может обслужить)',
  CORRIDORS: 'Коридоры (может обслужить)',
}

export function processDrivers(rows: DriverRow[]): Driver[] {
  const drivers: Driver[] = []
  rows.forEach((row, idx) => {
    const carrierRaw = row[COLS.CARRIER] ?? Object.values(row)[0] ?? ''
    const { name, phone, rawName } = extractPhoneAndName(carrierRaw)
    const pairs = splitPairsList(row[COLS.HISTORY] ?? '')
    // Expand all chain variants (| split to variants, each may contain || alternatives)
    const chainsField = row[COLS.CHAINS] ?? ''
    const chainVariants = splitVariantsTop(chainsField)
    const chains: string[][] = []
    for (const v of chainVariants) {
      for (const ex of expandAlternatives(v)) {
        const cleaned = ex.map((c) => normalizeCity(c)).filter(Boolean)
        if (cleaned.length >= 1) chains.push(cleaned)
      }
    }
    const branches = splitList(row[COLS.BRANCHES] ?? '')
    const corridors = splitList(row[COLS.CORRIDORS] ?? '')
    drivers.push({ id: idx, name, phone, rawName, pairs, chains, branches, corridors })
  })
  return drivers
}

function unorderedKey(a: string, b: string): string {
  return [a, b].sort().join('||')
}

function orderedKey(a: string, b: string): string {
  return `${a}|${b}`
}

export function buildIndices(drivers: Driver, lineChains: string[][]): Indices
export function buildIndices(drivers: Driver[], lineChains: string[][]): Indices
export function buildIndices(drivers: Driver[] | Driver, lineChains: string[][]): Indices {
  const list = Array.isArray(drivers) ? drivers : [drivers]
  const pairExact = new Map<string, Set<number>>()
  const subpathDir = new Map<string, Set<number>>()
  const subpathUnd = new Map<string, Set<number>>()
  const edgeDrivers = new Map<string, Set<number>>()
  const adj = new Map<string, Set<string>>()

  function addAdj(a: string, b: string) {
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }

  // From drivers
  for (const d of list) {
    // exact pairs from history (unordered)
    for (const [a, b] of d.pairs) {
      const key = unorderedKey(a, b)
      if (!pairExact.has(key)) pairExact.set(key, new Set())
      pairExact.get(key)!.add(d.id)
      addAdj(a, b)
    }
    // chains -> subpathDir, subpathUnd and edges
    for (const chain of d.chains) {
      for (let i = 0; i < chain.length; i++) {
        for (let j = i + 1; j < chain.length; j++) {
          const a = chain[i]
          const b = chain[j]
          const keyDir = orderedKey(a, b)
          const keyUnd = unorderedKey(a, b)
          if (!subpathDir.has(keyDir)) subpathDir.set(keyDir, new Set())
          subpathDir.get(keyDir)!.add(d.id)
          if (!subpathUnd.has(keyUnd)) subpathUnd.set(keyUnd, new Set())
          subpathUnd.get(keyUnd)!.add(d.id)
        }
      }
      // edges
      for (let i = 0; i + 1 < chain.length; i++) {
        const a = chain[i]
        const b = chain[i + 1]
        const ekey = unorderedKey(a, b)
        if (!edgeDrivers.has(ekey)) edgeDrivers.set(ekey, new Set())
        edgeDrivers.get(ekey)!.add(d.id)
        addAdj(a, b)
      }
    }
  }

  // From line_paths (adj only)
  for (const chain of lineChains) {
    for (let i = 0; i + 1 < chain.length; i++) {
      const a = normalizeCity(chain[i])
      const b = normalizeCity(chain[i + 1])
      if (a && b) addAdj(a, b)
    }
  }

  return { pairExact, subpathDir, subpathUnd, edgeDrivers, adj }
}
