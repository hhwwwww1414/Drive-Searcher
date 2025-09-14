import { CompositeResult, CompositeSegment, ExactResult, GeoResult, Indices } from './types'

function unorderedKey(a: string, b: string): string {
  return [a, b].sort().join('||')
}
function orderedKey(a: string, b: string): string {
  return `${a}|${b}`
}

// BFS shortest path on adjacency map
export function bfsPath(adj: Map<string, Set<string>>, start: string, goal: string): string[] | null {
  if (start === goal) return [start]
  const q: string[] = [start]
  const seen = new Set<string>([start])
  const prev = new Map<string, string>()
  while (q.length) {
    const u = q.shift()!
    const nbrs = adj.get(u) || new Set<string>()
    for (const v of nbrs) {
      if (seen.has(v)) continue
      seen.add(v)
      prev.set(v, u)
      if (v === goal) {
        // reconstruct
        const path: string[] = []
        let cur: string | undefined = v
        while (cur !== undefined) {
          path.push(cur)
          cur = prev.get(cur)
        }
        path.reverse()
        return path
      }
      q.push(v)
    }
  }
  return null
}

// BFS predecessors for all shortest paths; optionally skip a direct edge
function bfsPredecessors(
  adj: Map<string, Set<string>>,
  start: string,
  goal: string,
  skipEdge?: [string, string]
) {
  const q: string[] = [start]
  const dist = new Map<string, number>([[start, 0]])
  const pred = new Map<string, Set<string>>()
  while (q.length) {
    const u = q.shift()!
    const du = dist.get(u)!
    for (const v of adj.get(u) || []) {
      if (skipEdge && ((u === skipEdge[0] && v === skipEdge[1]) || (u === skipEdge[1] && v === skipEdge[0]))) continue
      if (!dist.has(v)) {
        dist.set(v, du + 1)
        pred.set(v, new Set([u]))
        q.push(v)
      } else if (dist.get(v)! === du + 1) {
        if (!pred.has(v)) pred.set(v, new Set())
        pred.get(v)!.add(u)
      }
    }
  }
  if (!dist.has(goal)) return null
  return { dist, pred }
}

// Enumerate up to K shortest (equal-length) paths using predecessor sets
function enumerateShortestPaths(pred: Map<string, Set<string>>, start: string, goal: string, k: number): string[][] {
  const paths: string[][] = []
  const cur: string[] = []
  function dfs(node: string) {
    if (paths.length >= k) return
    cur.push(node)
    if (node === start) {
      paths.push([...cur].reverse())
      cur.pop()
      return
    }
    const ps = pred.get(node)
    if (ps) {
      for (const p of ps) {
        dfs(p)
        if (paths.length >= k) break
      }
    }
    cur.pop()
  }
  dfs(goal)
  return paths
}

export function searchExact(indices: Indices, from: string, to: string, driverChains: Map<number, string[][]>): ExactResult[] {
  const { pairExact } = indices
  const ids = pairExact.get(unorderedKey(from, to))
  if (!ids) return []
  const results: ExactResult[] = []
  for (const id of ids) {
    // For each driver find the shortest fragment A..B among their chains
    const chains = driverChains.get(id) || []
    let best: string[] | null = null
    for (const chain of chains) {
      const i = chain.indexOf(from)
      const j = chain.indexOf(to)
      if (i !== -1 && j !== -1) {
        if (i < j) {
          const frag = chain.slice(i, j + 1)
          if (!best || frag.length < best.length) best = frag
        } else if (j < i) {
          const frag = chain.slice(j, i + 1).slice().reverse()
          if (!best || frag.length < best.length) best = frag
        }
      }
    }
    results.push({ driverId: id, chain: best || [from, to] })
  }
  // Sort: shorter first, then by driver name will be applied outside where names known
  results.sort((a, b) => a.chain.length - b.chain.length)
  return results
}

export function searchGeo(indices: Indices, from: string, to: string, driverChains?: Map<number, string[][]>): GeoResult[] {
  const { subpathDir, subpathUnd } = indices
  const set = new Set<number>()
  const a = orderedKey(from, to)
  const b = orderedKey(to, from)
  const und = unorderedKey(from, to)
  for (const s of [subpathDir.get(a), subpathDir.get(b), subpathUnd.get(und)]) {
    if (!s) continue
    for (const id of s) set.add(id)
  }
  if (set.size === 0) return []
  const results: GeoResult[] = []
  // If driverChains provided, compute the actual shortest A..B fragment in that driver's chains
  for (const id of set) {
    let best: string[] | null = null
    const chains = driverChains?.get(id) || []
    for (const chain of chains) {
      const i = chain.indexOf(from)
      const j = chain.indexOf(to)
      if (i !== -1 && j !== -1) {
        if (i < j) {
          const frag = chain.slice(i, j + 1)
          if (!best || frag.length < best.length) best = frag
        } else if (j < i) {
          const frag = chain.slice(j, i + 1).slice().reverse()
          if (!best || frag.length < best.length) best = frag
        }
      }
    }
    results.push({ driverId: id, chain: best || [from, to] })
  }
  return results
}

function planCompositeForPath(
  indices: Indices,
  sp: string[],
  maxDrivers: number,
  exclude: Set<number> = new Set()
): CompositeResult {
  const { adj, subpathUnd, subpathDir, pairExact } = indices
  if (sp.length <= 1) return { path: sp, segments: [], _meta: { segmentsCount: 0, score: 0 } }

  const n = sp.length - 1
  // Precompute cover sets for all i<j on this path using subpathUnd
  const cover: (Set<number> | null)[][] = Array.from({ length: n + 1 }, () => Array(n + 1).fill(null))
  for (let i = 0; i < sp.length; i++) {
    for (let j = i + 1; j < sp.length; j++) {
      const key = unorderedKey(sp[i]!, sp[j]!)
      // Union coverage: chains (unordered subpaths) + explicit history pairs
      const s1 = subpathUnd.get(key)
      const s2 = pairExact.get(key)
      const set = new Set<number>()
      if (s1) for (const id of s1) if (!exclude.has(id)) set.add(id)
      if (s2) for (const id of s2) if (!exclude.has(id)) set.add(id)
      cover[i][j] = set
    }
  }

  // Degree for hub heuristic
  const deg = (city: string) => (adj.get(city)?.size || 0)

  type State = { cnt: number; len: number; score: number; nextIndex: number | null; driverId: number | null }
  const dp: State[] = Array(sp.length).fill(null as any)
  dp[sp.length - 1] = { cnt: 0, len: 0, score: 0, nextIndex: null, driverId: null }

  const wLen = 5, wHub = 1, wStr = 1

  function strength(i: number, j: number, driverId: number): number {
    // Approx strength: count driver in both directions records for endpoints
    const s1 = subpathDir.get(orderedKey(sp[i]!, sp[j]!))
    const s2 = subpathDir.get(orderedKey(sp[j]!, sp[i]!))
    let v = 0
    if (s1 && s1.has(driverId)) v++
    if (s2 && s2.has(driverId)) v++
    return v
  }

  for (let i = sp.length - 2; i >= 0; i--) {
    let best: State | null = null
    for (let j = i + 1; j < sp.length; j++) {
      const cov = cover[i][j]!
      if (!cov || cov.size === 0) continue
      const next = dp[j]
      if (!next) continue
      // Respect driver limit
      if (next.cnt + 1 > maxDrivers) continue
      // Choose a driver (pick one with max strength)
      let pick: number | null = null
      let bestStr = -1
      for (const id of cov) {
        const str = strength(i, j, id)
        if (str > bestStr) { bestStr = str; pick = id }
      }
      if (pick == null) continue
      const segLen = j - i
      const sc = wLen * segLen + wHub * deg(sp[j]!) + wStr * (bestStr > 0 ? bestStr : 0)
      const cand: State = { cnt: next.cnt + 1, len: next.len + segLen, score: next.score + sc, nextIndex: j, driverId: pick }
      if (!best) best = cand
      else {
        // Prefer fewer segments -> shorter len -> higher score
        if (cand.cnt < best.cnt || (cand.cnt === best.cnt && (cand.len < best.len || (cand.len === best.len && cand.score > best.score)))) {
          best = cand
        }
      }
    }
    dp[i] = best as any
  }

  const plan = dp[0]
  if (!plan) {
    const allDrivers = Array.from((cover[0]?.[sp.length - 1] || new Set<number>()).values())
    return { path: sp, segments: [{ from: sp[0], to: sp[sp.length - 1], path: [...sp], driverId: null, driverIds: allDrivers }], _meta: { segmentsCount: 1, score: 0 } }
  }
  const segments: CompositeSegment[] = []
  let idx = 0
  while (idx < sp.length - 1) {
    const st = dp[idx]
    if (!st || st.nextIndex == null) break
    const j = st.nextIndex
    const allDrivers = Array.from((cover[idx]?.[j] || new Set<number>()).values())
    segments.push({ from: sp[idx]!, to: sp[j]!, path: sp.slice(idx, j + 1), driverId: st.driverId, driverIds: allDrivers })
    idx = j
  }
  return { path: sp, segments, _meta: { segmentsCount: segments.length, score: dp[0]?.score || 0 } }
}

export function searchComposite(
  indices: Indices,
  from: string,
  to: string,
  maxDrivers: number = 3,
  kPaths: number = 5,
  avoidDirect: boolean = false,
  exclude: Set<number> = new Set()
): CompositeResult | null {
  const { adj } = indices
  const res = bfsPredecessors(adj, from, to, avoidDirect ? [from, to] : undefined)
  if (!res) return null
  const { pred } = res
  const candidatesPaths = enumerateShortestPaths(pred, from, to, kPaths)
  if (candidatesPaths.length === 0) return null
  const plans = candidatesPaths.map((p) => planCompositeForPath(indices, p, maxDrivers, exclude))
  plans.sort((a, b) => (a._meta!.segmentsCount - b._meta!.segmentsCount) || (b._meta!.score - a._meta!.score))
  return plans[0] || null
}

export function searchCompositeMulti(
  indices: Indices,
  from: string,
  to: string,
  maxDrivers: number = 3,
  kPaths: number = 8,
  avoidDirect: boolean = false,
  exclude: Set<number> = new Set()
): CompositeResult[] {
  const { adj } = indices
  const res = bfsPredecessors(adj, from, to, avoidDirect ? [from, to] : undefined)
  if (!res) return []
  const { pred } = res
  const candidatesPaths = enumerateShortestPaths(pred, from, to, kPaths)
  if (!candidatesPaths.length) return []
  const out = candidatesPaths.map((p) => planCompositeForPath(indices, p, maxDrivers, exclude))
  out.sort((a, b) => (a._meta!.segmentsCount - b._meta!.segmentsCount) || (b._meta!.score - a._meta!.score))
  return out
}
