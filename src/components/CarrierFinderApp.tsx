import React, { useEffect, useMemo, useState } from 'react'
import { loadCitiesCsv, loadDriversCsv, loadLinePaths } from '../lib/csv'
import { processDrivers, buildIndices } from '../lib/indexer'
import { ExactResult, GeoResult, SearchResults } from '../lib/types'
import { normalizeCity } from '../lib/normalize'
import { searchComposite, searchCompositeMulti, searchExact, searchGeo } from '../lib/search'
import { SearchIcon } from './ui/icons'

type DriverView = ReturnType<typeof processDrivers>[number]

export default function CarrierFinderApp() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cities, setCities] = useState<string[]>([])
  const [drivers, setDrivers] = useState<DriverView[]>([])
  const [fromCity, setFromCity] = useState('')
  const [toCity, setToCity] = useState('')
  const [results, setResults] = useState<SearchResults>({ exact: [], geo: [], composite: null })
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)

  // Line chains from line_paths.csv
  const lineChainsRef = React.useRef<string[][]>([])

  // Precompute indices
  const { indices, driverChains } = useMemo(() => {
    const driverChains = new Map<number, string[][]>()
    for (const d of drivers) driverChains.set(d.id, d.chains)
    return { indices: buildIndices(drivers, lineChainsRef.current), driverChains }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const [driverRows, cityNames, lineChains] = await Promise.all([
          loadDriversCsv(),
          loadCitiesCsv(),
          loadLinePaths(),
        ])
        if (cancelled) return
        lineChainsRef.current = lineChains
        const processed = processDrivers(driverRows)
        const normalizedCities = Array.from(
          new Set(
            cityNames
              .map((c) => normalizeCity(c))
              .filter(Boolean)
          )
        ).sort()
        setDrivers(processed)
        setCities(normalizedCities)
        setError(null)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Ошибка загрузки данных')
      } finally {
        setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const canSearch = !loading && fromCity.trim() && toCity.trim()

  function getDriverName(id: number): string { return drivers.find((d) => d.id === id)?.name || '' }

  function onSearch() {
    const A = normalizeCity(fromCity)
    const B = normalizeCity(toCity)
    if (!A || !B) return

    // Validate cities existence
    const citySet = new Set(cities)
    const unknown: string[] = []
    if (!citySet.has(A)) unknown.push(A)
    if (!citySet.has(B)) unknown.push(B)
    if (unknown.length) {
      setResults({ exact: [], geo: [], composite: null })
      setError(`Город не найден: ${unknown.join(', ')}`)
      return
    }
    setError(null)

    // A == B special: drivers that include the city in any chain
    if (A === B) {
      const exact: ExactResult[] = drivers
        .filter((d) => d.chains.some((ch) => ch.includes(A)))
        .map((d) => ({ driverId: d.id, chain: [A] }))
        .sort((a, b) => getDriverName(a.driverId).localeCompare(getDriverName(b.driverId)))
      setResults({ exact, geo: [], composite: null })
      return
    }

    // Exact and Geo
    const exact: ExactResult[] = searchExact(indices, A, B, driverChains)
    // Dedup geo by excluding those in exact
    const exactIds = new Set(exact.map((r) => r.driverId))
    const geo: GeoResult[] = searchGeo(indices, A, B, driverChains).filter((g) => !exactIds.has(g.driverId))

    // Sorting by length, then name
    exact.sort((a, b) => a.chain.length - b.chain.length || getDriverName(a.driverId).localeCompare(getDriverName(b.driverId)))
    geo.sort((a, b) => a.chain.length - b.chain.length || getDriverName(a.driverId).localeCompare(getDriverName(b.driverId)))

    // Composite plan
    let composite = searchComposite(indices, A, B)
    let compositeAlts = [] as ReturnType<typeof searchCompositeMulti>
    if (exact.length === 0) {
      compositeAlts = searchCompositeMulti(indices, A, B).slice(0, 3)
    }

    // Deduplicate: if composite is one segment fully covered by a driver already in exact/geo with same A..B
    if (composite && composite.segments.length === 1) {
      const seg = composite.segments[0]
      const did = seg.driverId
      const dupInExact = did != null && exact.some((e) => e.driverId === did && e.chain[0] === A && e.chain[e.chain.length - 1] === B)
      const dupInGeo = did != null && geo.some((g) => g.driverId === did && g.chain[0] === A && g.chain[g.chain.length - 1] === B)
      if (dupInExact || dupInGeo) composite = null
    }

    setResults({ exact, geo, composite, compositeAlts })
  }

  const showComposite = !!results.composite && (results.exact.length === 0 || (results.composite?.segments.length ?? 0) > 1)

  const selectedDriver = selectedDriverId != null ? drivers.find((d) => d.id === selectedDriverId) || null : null

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-4">
        <header className="mb-6">
          <h1 className="text-gradient">Carrier Finder</h1>
          <p className="caption mt-1">Интерактивный поиск маршрутов и перевозчиков по данным CSV</p>
        </header>
        <div className="space-y-4 animate-fade-in-up">
          <div className="skeleton h-10 w-60 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="skeleton h-10 rounded-xl"></div>
            <div className="skeleton h-10 rounded-xl"></div>
            <div className="skeleton h-10 rounded-xl"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="skeleton h-24 rounded-2xl"></div>
            <div className="skeleton h-24 rounded-2xl"></div>
            <div className="skeleton h-24 rounded-2xl"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4">
      <header className="mb-6">
        <h1 className="text-gradient">Carrier Finder</h1>
        <p className="text-sm text-gray-600">Поиск перевозчиков по маршрутам из CSV (без ручных загрузок)</p>
      </header>

      {loading && (
        <div className="p-4 bg-white rounded border">Загрузка данных…</div>
      )}
      {!loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium">ОТКУДА</label>
              <input list="cities" value={fromCity} onChange={(e) => setFromCity(e.target.value)}
                     className="mt-1 w-full border rounded px-3 py-2" placeholder="Начните ввод…" />
            </div>
            <div>
              <label className="block text-sm font-medium">КУДА</label>
              <input list="cities" value={toCity} onChange={(e) => setToCity(e.target.value)}
                     className="mt-1 w-full border rounded px-3 py-2" placeholder="Начните ввод…" />
            </div>
            <div>
              <button disabled={!canSearch}
                      onClick={onSearch}
                      className={`w-full mt-6 px-4 py-2 rounded text-white ${canSearch ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                НАЙТИ
              </button>
            </div>
          </div>
          <datalist id="cities">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          {error && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <div>{error}</div>
              {(() => {
                const query = (error.includes('Город не найден') ? [normalizeCity(fromCity), normalizeCity(toCity)] : [])
                  .filter(Boolean)
                const suggestions = cities.filter((c) => query.some((q) => q && c.toLowerCase().startsWith(q.toLowerCase().slice(0, 2)))).slice(0, 10)
                return suggestions.length ? (
                  <div className="mt-1">Похожие: {suggestions.join(', ')}</div>
                ) : null
              })()}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ResultColumn title="Точные" emptyText="Нет точных совпадений">
                {results.exact.map((r) => (
                  <ResultCard key={`e-${r.driverId}`} title={getDriverName(r.driverId)}
                              subtitle={r.chain.join(' — ')} onClick={() => setSelectedDriverId(r.driverId)} />
                ))}
              </ResultColumn>
              <ResultColumn title="Гео" emptyText="Нет гео-совпадений">
                {results.geo.map((r) => (
                  <ResultCard key={`g-${r.driverId}`} title={getDriverName(r.driverId)}
                              subtitle={r.chain.join(' — ')} onClick={() => setSelectedDriverId(r.driverId)} />
                ))}
              </ResultColumn>
              {showComposite && (
                <ResultColumn title="Составной" emptyText="Путь не найден">
                  {results.composite && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-700">Путь: {results.composite.path.join(' — ')}</div>
                      <div className="space-y-2">
                        {results.composite.segments.map((s, idx) => {
                          const ids = (s.driverIds && s.driverIds.length ? s.driverIds : (s.driverId != null ? [s.driverId] : [])) as number[]
                          const idsSorted = [...ids].sort((a,b) => getDriverName(a).localeCompare(getDriverName(b)))
                          return (
                            <div key={idx} className="card p-3">
                              <div className="text-sm font-medium">{s.path.join(' — ')}</div>
                              <div className="text-xs text-gray-600">
                                {idsSorted.length ? (
                                  <span>
                                    {idsSorted.map((id, i) => (
                                      <span key={id}>
                                        {i > 0 && <span>{', '}</span>}
                                        <button className="underline" onClick={() => setSelectedDriverId(id)}>
                                          {getDriverName(id)}
                                        </button>
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  'Нет подходящего водителя'
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {results.compositeAlts && results.compositeAlts.length > 1 && (
                        <div className="pt-2 border-t mt-2">
                          <div className="text-xs text-gray-500 mb-1">Другие варианты (кратчайшие):</div>
                          <div className="space-y-2">
                            {results.compositeAlts.slice(1).map((alt, i) => (
                              <div key={i} className="card p-3">
                                <div className="text-xs text-gray-700">Путь: {alt.path.join(' — ')}</div>
                                {alt.segments.map((s, j) => {
                                  const ids = (s.driverIds && s.driverIds.length ? s.driverIds : (s.driverId != null ? [s.driverId] : [])) as number[]
                                  const idsSorted = [...ids].sort((a,b) => getDriverName(a).localeCompare(getDriverName(b)))
                                  return (
                                    <div key={j} className="text-xs text-gray-600">
                                      <span className="font-medium">{s.path.join(' — ')}</span>{' '}
                                      {idsSorted.length ? (
                                        <span>
                                          {idsSorted.map((id, i) => (
                                            <span key={id}>
                                              {i > 0 && <span>{', '}</span>}
                                              <button className="underline" onClick={() => setSelectedDriverId(id)}>
                                                {getDriverName(id)}
                                              </button>
                                            </span>
                                          ))}
                                        </span>
                                      ) : (
                                        'Нет подходящего водителя'
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ResultColumn>
              )}
            </div>
            <div className="lg:col-span-1">
              <aside className="card p-4 sticky top-3">
                <h3 className="font-semibold mb-2">Карточка водителя</h3>
                {!selectedDriver && <div className="text-sm text-gray-500">Выберите водителя из списка</div>}
                {selectedDriver && (
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium">{selectedDriver.name}</div>
                      <div className="text-sm text-gray-600">{selectedDriver.phone}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Маршруты из истории</div>
                      <ul className="text-sm list-disc ml-5">
                        {selectedDriver.pairs.map(([a, b], i) => (
                          <li key={i}>{a} — {b}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Города (детализация)</div>
                      <ul className="text-sm list-disc ml-5 max-h-48 overflow-auto">
                        {selectedDriver.chains.map((ch, i) => (
                          <li key={i}>{ch.join(' — ')}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Ветки</div>
                      <div className="text-sm text-gray-700">{selectedDriver.branches.join(', ') || '—'}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Коридоры</div>
                      <div className="text-sm text-gray-700">{selectedDriver.corridors.join(', ') || '—'}</div>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>

          <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-4">
              <h3 className="font-semibold mb-2">Водители</h3>
              <ul className="space-y-2 max-h-80 overflow-auto pr-1">
                {drivers.map((d) => (
                  <li key={d.id} className="card p-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-gray-600">{d.pairs.length} пар, {d.chains.length} маршрутов; {d.corridors.slice(0,3).join(', ')}</div>
                    </div>
                    <button className="text-blue-600 underline text-sm" onClick={() => setSelectedDriverId(d.id)}>Открыть</button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-4 lg:col-span-2">
              <h3 className="font-semibold mb-2">Сделки</h3>
              <div className="text-sm text-gray-500">Заглушка: функционал сделок будет добавлен позже.</div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function ResultColumn({ title, children, emptyText }: { title: string; children: React.ReactNode; emptyText: string }) {
  const hasChildren = React.Children.count(children) > 0
  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">{title}</div>
      <div className="space-y-2">
        {hasChildren ? children : <div className="text-sm text-gray-500">{emptyText}</div>}
      </div>
    </div>
  )
}

function ResultCard({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left border rounded p-2 bg-white hover:bg-gray-50 w-full">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-gray-600 truncate" title={subtitle}>{subtitle}</div>
    </button>
  )
}
