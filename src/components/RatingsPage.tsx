import React, { useEffect, useState } from 'react'
import { loadCityRatings, loadRouteRatings, loadDriverRatings } from '../lib/csv'
import type { CityRating, RouteRating, DriverRating } from '../lib/types'

// Tabs identifiers
const tabs = [
  { key: 'cities', label: 'Города' },
  { key: 'routes', label: 'Маршруты' },
  { key: 'carriers', label: 'Перевозчики' },
] as const

type TabKey = typeof tabs[number]['key']

export default function RatingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('cities')
  const [cities, setCities] = useState<CityRating[]>([])
  const [routes, setRoutes] = useState<RouteRating[]>([])
  const [carriers, setCarriers] = useState<DriverRating[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // city filters
  const [cityName, setCityName] = useState('')
  const [cityRatingMin, setCityRatingMin] = useState('')
  const [cityDealsStartedMin, setCityDealsStartedMin] = useState('')
  const [cityDealsFinishedMin, setCityDealsFinishedMin] = useState('')
  const [cityBidsStartMin, setCityBidsStartMin] = useState('')
  const [cityBidsFinishMin, setCityBidsFinishMin] = useState('')
  const [cityBidsTotalMin, setCityBidsTotalMin] = useState('')
  const [cityRoutesMin, setCityRoutesMin] = useState('')
  const [cityFleetDensityMin, setCityFleetDensityMin] = useState('')
  const [cityAvgBidMin, setCityAvgBidMin] = useState('')
  // route filters
  const [routeFrom, setRouteFrom] = useState('')
  const [routeTo, setRouteTo] = useState('')
  const [routeDealsMin, setRouteDealsMin] = useState('')
  // carrier filters
  const [carrierQuery, setCarrierQuery] = useState('')

  function clearFilters() {
    setCityName('')
    setCityRatingMin('')
    setCityDealsStartedMin('')
    setCityDealsFinishedMin('')
    setCityBidsStartMin('')
    setCityBidsFinishMin('')
    setCityBidsTotalMin('')
    setCityRoutesMin('')
    setCityFleetDensityMin('')
    setCityAvgBidMin('')
    setRouteFrom('')
    setRouteTo('')
    setRouteDealsMin('')
    setCarrierQuery('')
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (activeTab === 'cities') {
          const data = await loadCityRatings()
          if (!cancelled) setCities(data)
        } else if (activeTab === 'routes') {
          const data = await loadRouteRatings()
          if (!cancelled) setRoutes(data)
        } else {
          const data = await loadDriverRatings()
          if (!cancelled) setCarriers(data)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Ошибка загрузки данных')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // fetch every time tab changes; could be cached but fine
    load()
    return () => {
      cancelled = true
    }
  }, [activeTab])

  function renderTable() {
    if (activeTab === 'cities') {
      const minRating = cityRatingMin ? Number(cityRatingMin) : -Infinity
      const minDealsStarted = cityDealsStartedMin
        ? Number(cityDealsStartedMin)
        : -Infinity
      const minDealsFinished = cityDealsFinishedMin
        ? Number(cityDealsFinishedMin)
        : -Infinity
      const minBidsStart = cityBidsStartMin ? Number(cityBidsStartMin) : -Infinity
      const minBidsFinish = cityBidsFinishMin
        ? Number(cityBidsFinishMin)
        : -Infinity
      const minBidsTotal = cityBidsTotalMin ? Number(cityBidsTotalMin) : -Infinity
      const minRoutes = cityRoutesMin ? Number(cityRoutesMin) : -Infinity
      const minFleetDensity = cityFleetDensityMin
        ? Number(cityFleetDensityMin)
        : -Infinity
      const minAvgBid = cityAvgBidMin ? Number(cityAvgBidMin) : -Infinity
      const filtered = cities.filter(
        (c) =>
          c.city.toLowerCase().includes(cityName.toLowerCase()) &&
          c.rating >= minRating &&
          c.dealsStarted >= minDealsStarted &&
          c.dealsFinished >= minDealsFinished &&
          c.bidsStart >= minBidsStart &&
          c.bidsFinish >= minBidsFinish &&
          c.bidsTotal >= minBidsTotal &&
          c.routes >= minRoutes &&
          c.fleetDensity >= minFleetDensity &&
          c.avgBid >= minAvgBid
      )
      return (
        <>
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            <input
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="Название города"
              className="border px-2 py-1 rounded"
            />
            <input
              type="number"
              value={cityRatingMin}
              onChange={(e) => setCityRatingMin(e.target.value)}
              placeholder="Мин. рейтинг"
              className="border px-2 py-1 rounded w-32"
            />
            <input
              type="number"
              value={cityDealsStartedMin}
              onChange={(e) => setCityDealsStartedMin(e.target.value)}
              placeholder="Сделок началось ≥"
              className="border px-2 py-1 rounded w-32"
            />
            <input
              type="number"
              value={cityDealsFinishedMin}
              onChange={(e) => setCityDealsFinishedMin(e.target.value)}
              placeholder="Сделок завершилось ≥"
              className="border px-2 py-1 rounded w-32"
            />
            <input
              type="number"
              value={cityBidsStartMin}
              onChange={(e) => setCityBidsStartMin(e.target.value)}
              placeholder="Сумма ставок (старт) ≥"
              className="border px-2 py-1 rounded w-40"
            />
            <input
              type="number"
              value={cityBidsFinishMin}
              onChange={(e) => setCityBidsFinishMin(e.target.value)}
              placeholder="Сумма ставок (финиш) ≥"
              className="border px-2 py-1 rounded w-40"
            />
            <input
              type="number"
              value={cityBidsTotalMin}
              onChange={(e) => setCityBidsTotalMin(e.target.value)}
              placeholder="Сумма ставок (итого) ≥"
              className="border px-2 py-1 rounded w-40"
            />
            <input
              type="number"
              value={cityRoutesMin}
              onChange={(e) => setCityRoutesMin(e.target.value)}
              placeholder="Маршрутов ≥"
              className="border px-2 py-1 rounded w-32"
            />
            <input
              type="number"
              value={cityFleetDensityMin}
              onChange={(e) => setCityFleetDensityMin(e.target.value)}
              placeholder="Плотность парка ≥"
              className="border px-2 py-1 rounded w-32"
            />
            <input
              type="number"
              value={cityAvgBidMin}
              onChange={(e) => setCityAvgBidMin(e.target.value)}
              placeholder="Средняя ставка ≥"
              className="border px-2 py-1 rounded w-32"
            />
            <button onClick={clearFilters} className="border px-2 py-1 rounded">
              Сбросить
            </button>
          </div>
          {renderCityTable(filtered)}
        </>
      )
    }
    if (activeTab === 'routes') {
      const minDeals = routeDealsMin ? Number(routeDealsMin) : -Infinity
      const filtered = routes.filter((r) => {
        const [from, to] = r.route.split(' — ').map((s) => s.trim().toLowerCase())
        return (
          from.includes(routeFrom.toLowerCase()) &&
          to.includes(routeTo.toLowerCase()) &&
          r.deals >= minDeals
        )
      })
      return (
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            <input
              value={routeFrom}
              onChange={(e) => setRouteFrom(e.target.value)}
              placeholder="Город A"
              className="border px-2 py-1 rounded"
            />
            <input
              value={routeTo}
              onChange={(e) => setRouteTo(e.target.value)}
              placeholder="Город B"
              className="border px-2 py-1 rounded"
            />
            <input
              type="number"
              value={routeDealsMin}
              onChange={(e) => setRouteDealsMin(e.target.value)}
              placeholder="Мин. сделок"
              className="border px-2 py-1 rounded w-32"
            />
            <button onClick={clearFilters} className="border px-2 py-1 rounded">
              Сбросить
            </button>
          </div>
          {renderRouteTable(filtered)}
        </>
      )
    }
    const filtered = carriers.filter(
      (c) =>
        c.name.toLowerCase().includes(carrierQuery.toLowerCase()) ||
        c.phone.includes(carrierQuery)
    )
    return (
      <>
        <div className="mb-2 flex flex-wrap gap-2">
          <input
            value={carrierQuery}
            onChange={(e) => setCarrierQuery(e.target.value)}
            placeholder="Имя или телефон"
            className="border px-2 py-1 rounded"
          />
          <button onClick={clearFilters} className="border px-2 py-1 rounded">
            Сбросить
          </button>
        </div>
        {renderCarrierTable(filtered)}
      </>
    )
  }

  return (
    <div className="p-4">
      <div className="flex space-x-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded ${t.key === activeTab ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-500">Загрузка...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && renderTable()}
    </div>
  )
}

function renderCityTable(rows: CityRating[]) {
  if (!rows.length) return <div className="text-sm text-gray-500">Нет данных</div>
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Город</th>
            <th className="px-2 py-1 text-left">Рейтинг</th>
            <th className="px-2 py-1 text-left">Сделок началось</th>
            <th className="px-2 py-1 text-left">Сделок завершилось</th>
            <th className="px-2 py-1 text-left">Сумма ставок (старт)</th>
            <th className="px-2 py-1 text-left">Сумма ставок (финиш)</th>
            <th className="px-2 py-1 text-left">Сумма ставок (итого)</th>
            <th className="px-2 py-1 text-left">Маршрутов через город</th>
            <th className="px-2 py-1 text-left">Плотность парка</th>
            <th className="px-2 py-1 text-left">Средняя ставка</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-gray-50">
              <td className="px-2 py-1">{r.city}</td>
              <td className="px-2 py-1">{r.rating}</td>
              <td className="px-2 py-1">{r.dealsStarted}</td>
              <td className="px-2 py-1">{r.dealsFinished}</td>
              <td className="px-2 py-1">{r.bidsStart}</td>
              <td className="px-2 py-1">{r.bidsFinish}</td>
              <td className="px-2 py-1">{r.bidsTotal}</td>
              <td className="px-2 py-1">{r.routes}</td>
              <td className="px-2 py-1">{r.fleetDensity}</td>
              <td className="px-2 py-1">{r.avgBid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderRouteTable(rows: RouteRating[]) {
  if (!rows.length) return <div className="text-sm text-gray-500">Нет данных</div>
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Маршрут</th>
            <th className="px-2 py-1 text-left">Сделок</th>
            <th className="px-2 py-1 text-left">Сумма ставок</th>
            <th className="px-2 py-1 text-left">Средняя ставка</th>
            <th className="px-2 py-1 text-left">Водителей</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-gray-50">
              <td className="px-2 py-1 whitespace-nowrap">{r.route}</td>
              <td className="px-2 py-1">{r.deals}</td>
              <td className="px-2 py-1">{r.bidsSum}</td>
              <td className="px-2 py-1">{r.avgBid}</td>
              <td className="px-2 py-1">{r.drivers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderCarrierTable(rows: DriverRating[]) {
  if (!rows.length) return <div className="text-sm text-gray-500">Нет данных</div>
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">ФИО</th>
            <th className="px-2 py-1 text-left">Телефон</th>
            <th className="px-2 py-1 text-left">Количество сделок</th>
            <th className="px-2 py-1 text-left">Общая сумма</th>
            <th className="px-2 py-1 text-left">Доступные маршруты</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-gray-50">
              <td className="px-2 py-1 whitespace-nowrap">{r.name}</td>
              <td className="px-2 py-1 whitespace-nowrap">{r.phone}</td>
              <td className="px-2 py-1">{r.deals}</td>
              <td className="px-2 py-1">{r.bidsSum}</td>
              <td className="px-2 py-1">{r.routes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

