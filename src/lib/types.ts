export type DriverRow = Record<string, string>

export type Driver = {
  id: number
  name: string
  phone: string
  rawName: string
  pairs: [string, string][]
  chains: string[][]
  branches: string[]
  corridors: string[]
}

export type Indices = {
  pairExact: Map<string, Set<number>>
  subpathDir: Map<string, Set<number>>
  subpathUnd: Map<string, Set<number>>
  edgeDrivers: Map<string, Set<number>>
  adj: Map<string, Set<string>>
}

export type SearchInput = {
  from: string
  to: string
}

export type ExactResult = {
  driverId: number
  chain: string[]
}

export type GeoResult = {
  driverId: number
  chain: string[]
}

export type CompositeSegment = {
  from: string
  to: string
  path: string[]
  // Primary picked driver for the segment (kept for compatibility)
  driverId: number | null
  // All drivers that can cover the entire segment from->to
  driverIds?: number[]
}

export type CompositeResult = {
  path: string[]
  segments: CompositeSegment[]
  // optional meta used internally for ranking
  _meta?: { segmentsCount: number; score: number }
}

export type SearchResults = {
  exact: ExactResult[]
  geo: GeoResult[]
  composite: CompositeResult | null
  compositeAlts?: CompositeResult[]
}

export interface CityRating {
  city: string
  rating: number
  dealsStarted: number
  dealsFinished: number
  bidsStart: number
  bidsFinish: number
  bidsTotal: number
  routes: number
  fleetDensity: number
  avgBid: number
}

export interface RouteRating {
  route: string
  rating: number
  trips: number
  drivers: number
  bidsSum: number
  avgBid: number
}

export interface DriverRating {
  name: string
  phone: string
  deals: number
  bidsSum: number
  routes: number
}
