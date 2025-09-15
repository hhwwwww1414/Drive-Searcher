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
  { key: 'trips', label: 'Сделок' },
  { key: 'bidsSum', label: 'Сумма ставок' },
  { key: 'avgBid', label: 'Средняя ставка' },
  { key: 'drivers', label: 'Уник. водителей' },
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
  { key: 'deals', label: 'Сделок' },
  { key: 'bidsSum', label: 'Общая сумма' },
  { key: 'uniqueRoutes', label: 'Доступные маршруты' },
]

type Dir = 'min' | 'max'

interface NumberFilterProps {
  value: string
  onValueChange: (v: string) => void
  dir: Dir
  onDirChange: (d: Dir) => void
  placeholder: string
  className?: string
}

function NumberFilter({
  value,
  onValueChange,
  dir,
  onDirChange,
  placeholder,
  className = '',
}: NumberFilterProps) {
  return (
    <div className="flex">
      <select
        value={dir}
        onChange={(e) => onDirChange(e.target.value as Dir)}
        className="border px-1 py-1 rounded-l"
      >
        <option value="min">≥</option>
        <option value="max">≤</option>
      </select>
      <input
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={`border px-2 py-1 rounded-r ${className}`}
      />
    </div>
  )
}

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
  const [cityRatingDir, setCityRatingDir] = useState<Dir>('min')
  const [cityDealsStartedMin, setCityDealsStartedMin] = useState('')
  const [cityDealsStartedDir, setCityDealsStartedDir] = useState<Dir>('min')
  const [cityDealsFinishedMin, setCityDealsFinishedMin] = useState('')
  const [cityDealsFinishedDir, setCityDealsFinishedDir] = useState<Dir>('min')
  const [cityBidsStartMin, setCityBidsStartMin] = useState('')
  const [cityBidsStartDir, setCityBidsStartDir] = useState<Dir>('min')
  const [cityBidsFinishMin, setCityBidsFinishMin] = useState('')
  const [cityBidsFinishDir, setCityBidsFinishDir] = useState<Dir>('min')
  const [cityBidsTotalMin, setCityBidsTotalMin] = useState('')
  const [cityBidsTotalDir, setCityBidsTotalDir] = useState<Dir>('min')
  const [cityRoutesMin, setCityRoutesMin] = useState('')
  const [cityRoutesDir, setCityRoutesDir] = useState<Dir>('min')
  const [cityFleetDensityMin, setCityFleetDensityMin] = useState('')
  const [cityFleetDensityDir, setCityFleetDensityDir] = useState<Dir>('min')
  const [cityAvgBidMin, setCityAvgBidMin] = useState('')
  const [cityAvgBidDir, setCityAvgBidDir] = useState<Dir>('min')
  // route filters
  const [routeFrom, setRouteFrom] = useState('')
  const [routeTo, setRouteTo] = useState('')
  const [routeTripsMin, setRouteTripsMin] = useState('')
  const [routeTripsDir, setRouteTripsDir] = useState<Dir>('min')
  const [routeDriversMin, setRouteDriversMin] = useState('')
  const [routeDriversDir, setRouteDriversDir] = useState<Dir>('min')
  const [routeBidsSumMin, setRouteBidsSumMin] = useState('')
  const [routeBidsSumDir, setRouteBidsSumDir] = useState<Dir>('min')
  const [routeAvgBidMin, setRouteAvgBidMin] = useState('')
  const [routeAvgBidDir, setRouteAvgBidDir] = useState<Dir>('min')
  // carrier filters
  const [carrierQuery, setCarrierQuery] = useState('')
  const [carrierDealsMin, setCarrierDealsMin] = useState('')
  const [carrierDealsDir, setCarrierDealsDir] = useState<Dir>('min')
  const [carrierBidsSumMin, setCarrierBidsSumMin] = useState('')
  const [carrierBidsSumDir, setCarrierBidsSumDir] = useState<Dir>('min')
  const [carrierUniqueRoutesMin, setCarrierUniqueRoutesMin] = useState('')
  const [carrierUniqueRoutesDir, setCarrierUniqueRoutesDir] = useState<Dir>('min')

  function cmp(val: number, filter: string, dir: Dir) {
    if (!filter) return true
    const num = Number(filter)
    return dir === 'min' ? val >= num : val <= num
  }

  function clearFilters() {
    setCityName('')
    setCityRatingMin('')
    setCityRatingDir('min')
    setCityDealsStartedMin('')
    setCityDealsStartedDir('min')
    setCityDealsFinishedMin('')
    setCityDealsFinishedDir('min')
    setCityBidsStartMin('')
    setCityBidsStartDir('min')
    setCityBidsFinishMin('')
    setCityBidsFinishDir('min')
    setCityBidsTotalMin('')
    setCityBidsTotalDir('min')
    setCityRoutesMin('')
    setCityRoutesDir('min')
    setCityFleetDensityMin('')
    setCityFleetDensityDir('min')
    setCityAvgBidMin('')
    setCityAvgBidDir('min')
    setRouteFrom('')
    setRouteTo('')
    setRouteTripsMin('')
    setRouteTripsDir('min')
    setRouteDriversMin('')
    setRouteDriversDir('min')
    setRouteBidsSumMin('')
    setRouteBidsSumDir('min')
    setRouteAvgBidMin('')
    setRouteAvgBidDir('min')
    setCarrierQuery('')
    setCarrierDealsMin('')
    setCarrierDealsDir('min')
    setCarrierBidsSumMin('')
    setCarrierBidsSumDir('min')
    setCarrierUniqueRoutesMin('')
    setCarrierUniqueRoutesDir('min')
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
      const filtered = cities.filter(
        (c) =>
          c.city.toLowerCase().includes(cityName.toLowerCase()) &&
          cmp(c.rating, cityRatingMin, cityRatingDir) &&
          cmp(c.dealsStarted, cityDealsStartedMin, cityDealsStartedDir) &&
          cmp(c.dealsFinished, cityDealsFinishedMin, cityDealsFinishedDir) &&
          cmp(c.bidsStart, cityBidsStartMin, cityBidsStartDir) &&
          cmp(c.bidsFinish, cityBidsFinishMin, cityBidsFinishDir) &&
          cmp(c.bidsTotal, cityBidsTotalMin, cityBidsTotalDir) &&
          cmp(c.routes, cityRoutesMin, cityRoutesDir) &&
          cmp(c.fleetDensity, cityFleetDensityMin, cityFleetDensityDir) &&
          cmp(c.avgBid, cityAvgBidMin, cityAvgBidDir)
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
            <NumberFilter
              value={cityRatingMin}
              onValueChange={setCityRatingMin}
              dir={cityRatingDir}
              onDirChange={setCityRatingDir}
              placeholder="Рейтинг"
              className="w-32"
            />
            <NumberFilter
              value={cityDealsStartedMin}
              onValueChange={setCityDealsStartedMin}
              dir={cityDealsStartedDir}
              onDirChange={setCityDealsStartedDir}
              placeholder="Сделок началось"
              className="w-32"
            />
            <NumberFilter
              value={cityDealsFinishedMin}
              onValueChange={setCityDealsFinishedMin}
              dir={cityDealsFinishedDir}
              onDirChange={setCityDealsFinishedDir}
              placeholder="Сделок завершилось"
              className="w-32"
            />
            <NumberFilter
              value={cityBidsStartMin}
              onValueChange={setCityBidsStartMin}
              dir={cityBidsStartDir}
              onDirChange={setCityBidsStartDir}
              placeholder="Сумма ставок (старт)"
              className="w-40"
            />
            <NumberFilter
              value={cityBidsFinishMin}
              onValueChange={setCityBidsFinishMin}
              dir={cityBidsFinishDir}
              onDirChange={setCityBidsFinishDir}
              placeholder="Сумма ставок (финиш)"
              className="w-40"
            />
            <NumberFilter
              value={cityBidsTotalMin}
              onValueChange={setCityBidsTotalMin}
              dir={cityBidsTotalDir}
              onDirChange={setCityBidsTotalDir}
              placeholder="Сумма ставок (итого)"
              className="w-40"
            />
            <NumberFilter
              value={cityRoutesMin}
              onValueChange={setCityRoutesMin}
              dir={cityRoutesDir}
              onDirChange={setCityRoutesDir}
              placeholder="Маршрутов"
              className="w-32"
            />
            <NumberFilter
              value={cityFleetDensityMin}
              onValueChange={setCityFleetDensityMin}
              dir={cityFleetDensityDir}
              onDirChange={setCityFleetDensityDir}
              placeholder="Плотность парка"
              className="w-32"
            />
            <NumberFilter
              value={cityAvgBidMin}
              onValueChange={setCityAvgBidMin}
              dir={cityAvgBidDir}
              onDirChange={setCityAvgBidDir}
              placeholder="Средняя ставка"
              className="w-32"
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
      const filtered = routes.filter((r) => {
        const [from, to] = r.route.split(' — ').map((s) => s.trim().toLowerCase())
        return (
          from.includes(routeFrom.toLowerCase()) &&
          to.includes(routeTo.toLowerCase()) &&
          cmp(r.trips, routeTripsMin, routeTripsDir) &&
          cmp(r.drivers, routeDriversMin, routeDriversDir) &&
          cmp(r.bidsSum, routeBidsSumMin, routeBidsSumDir) &&
          cmp(r.avgBid, routeAvgBidMin, routeAvgBidDir)
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
            <NumberFilter
              value={routeTripsMin}
              onValueChange={setRouteTripsMin}
              dir={routeTripsDir}
              onDirChange={setRouteTripsDir}
              placeholder="Сделок"
              className="w-32"
            />
            <NumberFilter
              value={routeDriversMin}
              onValueChange={setRouteDriversMin}
              dir={routeDriversDir}
              onDirChange={setRouteDriversDir}
              placeholder="Водителей"
              className="w-32"
            />
            <NumberFilter
              value={routeBidsSumMin}
              onValueChange={setRouteBidsSumMin}
              dir={routeBidsSumDir}
              onDirChange={setRouteBidsSumDir}
              placeholder="Сумма ставок"
              className="w-36"
            />
            <NumberFilter
              value={routeAvgBidMin}
              onValueChange={setRouteAvgBidMin}
              dir={routeAvgBidDir}
              onDirChange={setRouteAvgBidDir}
              placeholder="Средняя ставка"
              className="w-36"
            />
            <button onClick={clearFilters} className="border px-2 py-1 rounded">
              Сбросить
            </button>
          </div>
          <RatingsTable data={filtered} columns={routeColumns} />
        </>
      )
    }
    const filtered = carriers.filter(
      (c) =>
        (c.name.toLowerCase().includes(carrierQuery.toLowerCase()) ||
          c.phone.includes(carrierQuery)) &&
        cmp(c.deals, carrierDealsMin, carrierDealsDir) &&
        cmp(c.bidsSum, carrierBidsSumMin, carrierBidsSumDir) &&
        cmp(c.uniqueRoutes, carrierUniqueRoutesMin, carrierUniqueRoutesDir)
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
          <NumberFilter
            value={carrierDealsMin}
            onValueChange={setCarrierDealsMin}
            dir={carrierDealsDir}
            onDirChange={setCarrierDealsDir}
            placeholder="Сделок"
            className="w-32"
          />
          <NumberFilter
            value={carrierBidsSumMin}
            onValueChange={setCarrierBidsSumMin}
            dir={carrierBidsSumDir}
            onDirChange={setCarrierBidsSumDir}
            placeholder="Сумма ставок"
            className="w-36"
          />
          <NumberFilter
            value={carrierUniqueRoutesMin}
            onValueChange={setCarrierUniqueRoutesMin}
            dir={carrierUniqueRoutesDir}
            onDirChange={setCarrierUniqueRoutesDir}
            placeholder="Маршрутов"
            className="w-48"
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
