import React, { useEffect, useState } from 'react'
import { loadCityRatings, loadRouteRatings, loadDriverRatings } from '../lib/csv'
import type { CityRating, RouteRating, DriverRating } from '../lib/types'
import RatingsTable, { Column } from './RatingsTable'

// Tabs identifiers
const tabs = [
  { key: 'cities', label: 'Города' },
  { key: 'routes', label: 'Маршруты' },
  { key: 'carriers', label: 'Перевозчики' },
] as const

type TabKey = typeof tabs[number]['key']

const cityColumns: Column<CityRating>[] = [
  { key: 'city', label: 'Город' },
  { key: 'rating', label: 'Рейтинг' },
  { key: 'dealsStarted', label: 'Сделок началось' },
  { key: 'dealsFinished', label: 'Сделок завершилось' },
  { key: 'bidsStart', label: 'Сумма ставок (старт)' },
  { key: 'bidsFinish', label: 'Сумма ставок (финиш)' },
  { key: 'bidsTotal', label: 'Сумма ставок (итого)' },
  { key: 'routes', label: 'Маршрутов через город' },
  { key: 'fleetDensity', label: 'Плотность парка' },
  { key: 'avgBid', label: 'Средняя ставка' },
]

const routeColumns: Column<RouteRating>[] = [
  {
    key: 'route',
    label: 'Маршрут',
    render: (r) => <span className="whitespace-nowrap">{r.route}</span>,
  },
  { key: 'rating', label: 'Рейтинг' },
  { key: 'trips', label: 'Поездок' },
  { key: 'drivers', label: 'Водителей' },
  { key: 'bidsSum', label: 'Сумма ставок' },
  { key: 'avgBid', label: 'Средняя ставка' },
]

const carrierColumns: Column<DriverRating>[] = [
  {
    key: 'name',
    label: 'ФИО',
    render: (r) => <span className="whitespace-nowrap">{r.name}</span>,
  },
  {
    key: 'phone',
    label: 'Телефон',
    render: (r) => <span className="whitespace-nowrap">{r.phone}</span>,
  },
  { key: 'segments', label: 'Сегментов' },
  { key: 'deals', label: 'Сделок' },
  { key: 'bidsSum', label: 'Общая сумма' },
  { key: 'avgBid', label: 'Средняя ставка' },
  { key: 'uniqueRoutes', label: 'Уник. маршруты' },
  { key: 'uniqueCities', label: 'Уник. города' },
  {
    key: 'topRoute',
    label: 'Топ маршрут',
    render: (r) => <span className="whitespace-nowrap">{r.topRoute}</span>,
  },
]

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
  const [routeRatingMin, setRouteRatingMin] = useState('')
  const [routeTripsMin, setRouteTripsMin] = useState('')
  const [routeDriversMin, setRouteDriversMin] = useState('')
  const [routeBidsSumMin, setRouteBidsSumMin] = useState('')
  const [routeAvgBidMin, setRouteAvgBidMin] = useState('')
  // carrier filters
  const [carrierQuery, setCarrierQuery] = useState('')
  const [carrierSegmentsMin, setCarrierSegmentsMin] = useState('')
  const [carrierDealsMin, setCarrierDealsMin] = useState('')
  const [carrierBidsSumMin, setCarrierBidsSumMin] = useState('')
  const [carrierAvgBidMin, setCarrierAvgBidMin] = useState('')
  const [carrierUniqueRoutesMin, setCarrierUniqueRoutesMin] = useState('')
  const [carrierUniqueCitiesMin, setCarrierUniqueCitiesMin] = useState('')
  const [carrierTopRoute, setCarrierTopRoute] = useState('')

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
    setRouteRatingMin('')
    setRouteTripsMin('')
    setRouteDriversMin('')
    setRouteBidsSumMin('')
    setRouteAvgBidMin('')
    setCarrierQuery('')
    setCarrierSegmentsMin('')
    setCarrierDealsMin('')
    setCarrierBidsSumMin('')
    setCarrierAvgBidMin('')
    setCarrierUniqueRoutesMin('')
    setCarrierUniqueCitiesMin('')
    setCarrierTopRoute('')
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
          <RatingsTable data={filtered} columns={cityColumns} />
        </>
      )
    }
    if (activeTab === 'routes') {
      const minRating = routeRatingMin ? Number(routeRatingMin) : -Infinity
      const minTrips = routeTripsMin ? Number(routeTripsMin) : -Infinity
      const minDrivers = routeDriversMin ? Number(routeDriversMin) : -Infinity
      const minBidsSum = routeBidsSumMin ? Number(routeBidsSumMin) : -Infinity
      const minAvgBid = routeAvgBidMin ? Number(routeAvgBidMin) : -Infinity
      const filtered = routes.filter((r) => {
        const [from, to] = r.route.split(' — ').map((s) => s.trim().toLowerCase())
        return (
          from.includes(routeFrom.toLowerCase()) &&
          to.includes(routeTo.toLowerCase()) &&
          r.rating >= minRating &&
          r.trips >= minTrips &&
          r.drivers >= minDrivers &&
          r.bidsSum >= minBidsSum &&
          r.avgBid >= minAvgBid
        )
      })
      return (
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            <input
              value={routeFrom}
              onChange={(e) => setRouteFrom(e.target.value)}
              placeholder="Город отправления"
              className="border px-2 py-1 rounded"
            />
            <input
              value={routeTo}
              onChange={(e) => setRouteTo(e.target.value)}
              placeholder="Город назначения"
              className="border px-2 py-1 rounded"
            />
            <input
              type="number"
              value={routeRatingMin}
              onChange={(e) => setRouteRatingMin(e.target.value)}
              placeholder="Мин. рейтинг"
              className="border px-2 py-1 rounded w-32"
            />
            <input
              type="number"
              value={routeTripsMin}
              onChange={(e) => setRouteTripsMin(e.target.value)}
              placeholder="Поездок ≥"
              className="border px-2 py-1 rounded w-32"
            />
            <input
              type="number"
              value={routeDriversMin}
              onChange={(e) => setRouteDriversMin(e.target.value)}
              placeholder="Водителей ≥"
              className="border px-2 py-1 rounded w-32"
            />
            <input
              type="number"
              value={routeBidsSumMin}
              onChange={(e) => setRouteBidsSumMin(e.target.value)}
              placeholder="Сумма ставок ≥"
              className="border px-2 py-1 rounded w-36"
            />
            <input
              type="number"
              value={routeAvgBidMin}
              onChange={(e) => setRouteAvgBidMin(e.target.value)}
              placeholder="Средняя ставка ≥"
              className="border px-2 py-1 rounded w-36"
            />
            <button onClick={clearFilters} className="border px-2 py-1 rounded">
              Сбросить
            </button>
          </div>
          <RatingsTable data={filtered} columns={routeColumns} />
        </>
      )
    }
    const minSegments = carrierSegmentsMin
      ? Number(carrierSegmentsMin)
      : -Infinity
    const minDeals = carrierDealsMin ? Number(carrierDealsMin) : -Infinity
    const minBidsSum = carrierBidsSumMin
      ? Number(carrierBidsSumMin)
      : -Infinity
    const minAvgBid = carrierAvgBidMin ? Number(carrierAvgBidMin) : -Infinity
    const minUniqueRoutes = carrierUniqueRoutesMin
      ? Number(carrierUniqueRoutesMin)
      : -Infinity
    const minUniqueCities = carrierUniqueCitiesMin
      ? Number(carrierUniqueCitiesMin)
      : -Infinity
    const filtered = carriers.filter(
      (c) =>
        (c.name.toLowerCase().includes(carrierQuery.toLowerCase()) ||
          c.phone.includes(carrierQuery)) &&
        c.segments >= minSegments &&
        c.deals >= minDeals &&
        c.bidsSum >= minBidsSum &&
        c.avgBid >= minAvgBid &&
        c.uniqueRoutes >= minUniqueRoutes &&
        c.uniqueCities >= minUniqueCities &&
        c.topRoute.toLowerCase().includes(carrierTopRoute.toLowerCase())
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
          <input
            type="number"
            value={carrierSegmentsMin}
            onChange={(e) => setCarrierSegmentsMin(e.target.value)}
            placeholder="Сегментов ≥"
            className="border px-2 py-1 rounded w-32"
          />
          <input
            type="number"
            value={carrierDealsMin}
            onChange={(e) => setCarrierDealsMin(e.target.value)}
            placeholder="Сделок ≥"
            className="border px-2 py-1 rounded w-32"
          />
          <input
            type="number"
            value={carrierBidsSumMin}
            onChange={(e) => setCarrierBidsSumMin(e.target.value)}
            placeholder="Сумма ставок ≥"
            className="border px-2 py-1 rounded w-36"
          />
          <input
            type="number"
            value={carrierAvgBidMin}
            onChange={(e) => setCarrierAvgBidMin(e.target.value)}
            placeholder="Средняя ставка ≥"
            className="border px-2 py-1 rounded w-36"
          />
          <input
            type="number"
            value={carrierUniqueRoutesMin}
            onChange={(e) => setCarrierUniqueRoutesMin(e.target.value)}
            placeholder="Уникальных маршрутов ≥"
            className="border px-2 py-1 rounded w-48"
          />
          <input
            type="number"
            value={carrierUniqueCitiesMin}
            onChange={(e) => setCarrierUniqueCitiesMin(e.target.value)}
            placeholder="Уникальных городов ≥"
            className="border px-2 py-1 rounded w-48"
          />
          <input
            value={carrierTopRoute}
            onChange={(e) => setCarrierTopRoute(e.target.value)}
            placeholder="Топ маршрут"
            className="border px-2 py-1 rounded"
          />
          <button onClick={clearFilters} className="border px-2 py-1 rounded">
            Сбросить
          </button>
        </div>
        <RatingsTable data={filtered} columns={carrierColumns} />
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
