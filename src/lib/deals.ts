import { Deal, Driver, RouteKey } from './types'
import { normalizeCity } from './normalize'

export type DriverCostAggregate = Map<number, Map<RouteKey, { sum: number; count: number }>>

function normalizePhone(phone: string): string {
  return phone.replace(/\D+/g, '')
}

export function makeRouteKey(from: string, to: string): RouteKey | null {
  const fromNorm = normalizeCity(from)
  const toNorm = normalizeCity(to)
  if (!fromNorm || !toNorm) return null
  return `${fromNorm}|${toNorm}`
}

export function aggregateDeals(deals: Deal[], drivers: Driver[]): DriverCostAggregate {
  const aggregate: DriverCostAggregate = new Map()
  if (!deals.length || !drivers.length) return aggregate

  const driverIds = new Set(drivers.map((d) => d.id))
  const phoneToId = new Map<string, number>()
  for (const driver of drivers) {
    const phone = driver.phone ? normalizePhone(driver.phone) : ''
    if (phone) phoneToId.set(phone, driver.id)
  }

  for (const deal of deals) {
    const routeKey = makeRouteKey(deal.from, deal.to)
    if (!routeKey) continue
    const cost = deal.cost
    if (!Number.isFinite(cost)) continue

    let driverId: number | null | undefined = deal.driverId
    if (driverId != null && !driverIds.has(driverId)) {
      driverId = null
    }
    if (driverId == null) {
      const phoneKey = normalizePhone(deal.phone || '')
      if (!phoneKey) continue
      driverId = phoneToId.get(phoneKey) ?? null
    }
    if (driverId == null) continue

    if (!aggregate.has(driverId)) aggregate.set(driverId, new Map())
    const driverMap = aggregate.get(driverId)!
    if (!driverMap.has(routeKey)) driverMap.set(routeKey, { sum: 0, count: 0 })
    const entry = driverMap.get(routeKey)!
    entry.sum += cost
    entry.count += 1
  }

  return aggregate
}

export function getDriverRouteAverage(
  aggregate: DriverCostAggregate,
  driverId: number,
  routeKey: RouteKey
): number | undefined {
  const stats = aggregate.get(driverId)?.get(routeKey)
  if (!stats || stats.count === 0) return undefined
  return stats.sum / stats.count
}

export function getDriverCostsForRoute(
  aggregate: DriverCostAggregate,
  routeKey: RouteKey
): Map<number, number> {
  const result = new Map<number, number>()
  for (const [driverId, routes] of aggregate.entries()) {
    const stats = routes.get(routeKey)
    if (stats && stats.count > 0) result.set(driverId, stats.sum / stats.count)
  }
  return result
}
