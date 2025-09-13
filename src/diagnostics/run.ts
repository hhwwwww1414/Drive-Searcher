/*
  Diagnostics: enumerate all city pairs and compute paths and available drivers.
  Usage: npm run diag [--max 200] [--filter CitySubstring]
*/
import { loadCitiesCsvNode, loadDriversCsvNode, loadLinePathsNode } from './nodeCsv'
import { normalizeCity } from '../lib/normalize'
import { processDrivers, buildIndices } from '../lib/indexer'
import { bfsPath, searchComposite, searchExact, searchGeo } from '../lib/search'
import { writeFile } from 'fs/promises'

type Args = { max?: number; filter?: string; from?: string; to?: string }

function parseArgs(): Args {
  const args: Args = {}
  const a = process.argv.slice(2)
  for (let i = 0; i < a.length; i++) {
    const t = a[i]
    if (t === '--max') args.max = Number(a[++i])
    else if (t === '--filter') args.filter = String(a[++i])
    else if (t === '--from') args.from = String(a[++i])
    else if (t === '--to') args.to = String(a[++i])
  }
  return args
}

async function main() {
  const { max, filter, from, to } = parseArgs()
  const root = '.'
  const [driverRows, cityNamesRaw, lineChainsRaw] = await Promise.all([
    loadDriversCsvNode(root),
    loadCitiesCsvNode(root),
    loadLinePathsNode(root),
  ])
  const drivers = processDrivers(driverRows)
  const driverChains = new Map<number, string[][]>()
  const driverName = new Map<number, string>()
  for (const d of drivers) { driverChains.set(d.id, d.chains); driverName.set(d.id, d.name) }

  const cities = Array.from(new Set(cityNamesRaw.map(normalizeCity).filter(Boolean))).sort()
  const indices = buildIndices(drivers, lineChainsRaw)

  // Candidate cities present in graph adjacency
  const inGraph = new Set<string>([...indices.adj.keys()])
  const baseCities = cities.filter((c) => inGraph.has(c))
  const filtered = filter ? baseCities.filter((c) => c.toLowerCase().includes(filter.toLowerCase())) : baseCities

  const pairs: [string, string][] = []
  if (from && to) {
    const A = normalizeCity(from)
    const B = normalizeCity(to)
    if (inGraph.has(A) && inGraph.has(B) && A !== B) pairs.push([A, B])
  } else {
    for (let i = 0; i < filtered.length; i++) {
      for (let j = 0; j < filtered.length; j++) {
        if (i === j) continue
        pairs.push([filtered[i], filtered[j]])
      }
    }
  }
  const limit = max && max > 0 ? max : pairs.length

  const results: any[] = []
  let processed = 0
  for (const [A, B] of pairs) {
    if (processed >= limit) break
    processed++
    const path = bfsPath(indices.adj, A, B)
    if (!path) continue
    const exact = searchExact(indices, A, B, driverChains).map((r) => ({ id: r.driverId, name: driverName.get(r.driverId), chain: r.chain }))
    const geo = searchGeo(indices, A, B, driverChains).map((r) => ({ id: r.driverId, name: driverName.get(r.driverId), chain: r.chain }))
    const composite = searchComposite(indices, A, B)

    // Edge-level coverage diagnostic on BFS path using subpathUnd
    const edges = [] as { from: string; to: string; drivers: { id: number; name: string }[] }[]
    for (let i = 0; i + 1 < path.length; i++) {
      const u = path[i], v = path[i + 1]
      const set = indices.subpathUnd.get([u, v].sort().join('||')) || new Set<number>()
      const list = [...set].map((id) => ({ id, name: driverName.get(id) || '' }))
      edges.push({ from: u, to: v, drivers: list })
    }

    results.push({ from: A, to: B, path, exact, geo, composite, edges })
    if (processed % 50 === 0) console.log(`Processed ${processed}/${limit}`)
  }

  await writeFile('diagnostics-all-routes.json', JSON.stringify(results, null, 2), 'utf8')
  console.log(`Diagnostics written: diagnostics-all-routes.json (pairs: ${results.length}, from ${filtered.length} cities)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
