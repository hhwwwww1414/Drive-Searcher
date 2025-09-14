import React from 'react'
import { CompositeResult } from '../lib/types'
import { clearHighlight, fitToPath, highlightPath, highlightSegment } from '../lib/map'

type Props = {
  variants: CompositeResult[]
  getDriverName: (id: number) => string
  onSelectDriver: (id: number) => void
}

export default function CompositePanel({ variants, getDriverName, onSelectDriver }: Props) {
  const [expandedList, setExpandedList] = React.useState(false)
  const [selectedIdx, setSelectedIdx] = React.useState(0)
  const selected = variants[selectedIdx]
  // per-segment driver selection map
  const [segDriver, setSegDriver] = React.useState<Record<number, number | null>>({})
  const [showAllSegments, setShowAllSegments] = React.useState(false)

  React.useEffect(() => { setSelectedIdx(0); setSegDriver({}); setShowAllSegments(false) }, [variants.map(v => v.path.join('>')).join('|')])

  // Keyboard: left/right to switch variants; Esc to clear temp highlight
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (variants.length === 0) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedIdx((i) => (i - 1 + variants.length) % variants.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedIdx((i) => (i + 1) % variants.length)
      } else if (e.key === 'Escape') {
        clearHighlight()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variants.length])

  if (!variants.length) {
    return (
      <div className="card p-4">
        <div className="mb-3"><span className="badge" title="Составной">СОСТАВНОЙ</span></div>
        <div className="text-sm text-gray-600">Сегментные планы не построены</div>
        <div className="text-xs text-gray-500 mt-1">Измените города или проверьте данные.</div>
      </div>
    )
  }

  // Deduplicate paths if any duplication sneaks in
  const uniqVariants = React.useMemo(() => {
    const seen = new Set<string>()
    const out: CompositeResult[] = []
    for (const v of variants) {
      const key = v.path.join('>')
      if (!seen.has(key)) { seen.add(key); out.push(v) }
    }
    return out
  }, [variants])

  const leftItems = expandedList ? uniqVariants : uniqVariants.slice(0, 4)
  const hiddenCount = Math.max(0, uniqVariants.length - leftItems.length)

  const transfersCount = (v: CompositeResult) => Math.max(0, (v.segments?.length || 0) - 1)
  const nodesCount = (v: CompositeResult) => v.path.length
  const transferNodes = (v: CompositeResult) => v.segments.slice(0, Math.max(0, v.segments.length - 1)).map(s => s.to)

  function onPickVariant(i: number) {
    setSelectedIdx(i)
    setSegDriver({})
  }

  return (
    <div className="comp-panel grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4 min-w-0">
      {/* Left: variants list */}
      <div className="card p-4 min-h-0">
        <div className="mb-3 flex items-center justify-between">
          <span className="badge" title="Составной">СОСТАВНОЙ</span>
          <div className="text-xs text-gray-500">Вариантов: {uniqVariants.length}</div>
        </div>
        <ul className="space-y-2 max-h-96 overflow-auto pr-1 w-full">
          {leftItems.map((v, i) => {
            const idx = i
            const isActive = selectedIdx === idx
            const route = v.path.join(' — ')
            return (
              <li key={route}
                  className={`card p-3 flex items-start sm:items-center gap-3 min-h-[84px] min-w-0 overflow-hidden ${isActive ? 'border-2 border-primary-500' : ''}`}
                  onMouseEnter={() => highlightPath(v.path, { temporary: true })}
                  onMouseLeave={() => clearHighlight()}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" title={route}>Путь {idx + 1}: {route}</div>
                  <div className="text-xs text-neutral-600">Длина: {nodesCount(v)} узлов • Пересадок: {transfersCount(v)}</div>
                </div>
                <div className="flex sm:flex-row flex-col items-stretch sm:items-center gap-1 sm:gap-2 shrink-0">
                  <button className="btn btn-ghost px-2 py-1 text-xs whitespace-nowrap" onClick={() => { onPickVariant(idx); }}>
                    Открыть
                  </button>
                  <button className="btn btn-ghost px-2 py-1 text-xs whitespace-nowrap" onClick={() => { highlightPath(v.path); fitToPath(v.path) }}>
                    Показать на карте
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        {hiddenCount > 0 && (
          <div className="mt-3">
            <button className="btn btn-ghost w-full text-sm" onClick={() => setExpandedList(true)}>Показать ещё {hiddenCount}</button>
          </div>
        )}
      </div>

      {/* Right: details */}
      <div className="card p-4 bg-neutral-50/70 min-h-0 min-w-0">
        <div className="mb-3">
          <span className="badge mr-2" title="Составной">СОСТАВНОЙ</span>
          <div className="text-lg font-semibold mt-1 truncate" title={selected.path.join(' — ')}>
            Путь {selectedIdx + 1}: {selected.path.join(' — ')}
          </div>
          <div className="text-sm text-neutral-600">Пересадок: {transfersCount(selected)} • Длина: {nodesCount(selected)} узлов</div>
        </div>

        {/* Segments */}
        <div className="space-y-4 max-h-[28rem] overflow-auto pr-1 min-w-0">
          {(showAllSegments ? selected.segments : selected.segments.slice(0, 4)).map((s, si) => {
            const ids = (s.driverIds && s.driverIds.length ? s.driverIds : (s.driverId != null ? [s.driverId] : [])) as number[]
            const idsSorted = [...ids].sort((a, b) => getDriverName(a).localeCompare(getDriverName(b)))
            const chosen = segDriver[si] ?? (s.driverId ?? null)
            const top = idsSorted.slice(0, 3)
            const rest = idsSorted.slice(3)
            return (
              <div key={`${s.from}-${s.to}-${si}`} className="rounded-xl border border-neutral-200 bg-white/80 p-3">
                <button className="w-full text-left" onClick={() => highlightSegment(s.path)}>
                  <div className="font-medium">Отрезок {si + 1}: {s.path.join(' — ')}</div>
                </button>
                <div className="mt-2">
                  <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Перевозчики</div>
                  <div className="flex flex-wrap gap-2">
                    {top.map((id) => (
                      <button key={id}
                              title={getDriverName(id)}
                              className={`chip ${chosen === id ? 'chip-active' : ''}`}
                              onClick={() => setSegDriver((m) => ({ ...m, [si]: id }))}>
                        {chosen === id ? <span className="mr-1">✓</span> : null}
                        {getDriverName(id)}
                      </button>
                    ))}
                    {rest.length > 0 && (
                      <details className="relative">
                        <summary className="chip cursor-pointer select-none list-none">+ ещё {rest.length}</summary>
                        <div className="mt-2 p-2 rounded-xl border border-neutral-200 bg-white/95 shadow-elev-2 max-w-[24rem] z-10">
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-auto">
                            {rest.slice(0, 50).map((id) => (
                              <button key={id}
                                      title={getDriverName(id)}
                                      className={`chip ${chosen === id ? 'chip-active' : ''}`}
                                      onClick={() => setSegDriver((m) => ({ ...m, [si]: id }))}>
                                {chosen === id ? <span className="mr-1">✓</span> : null}
                                {getDriverName(id)}
                              </button>
                            ))}
                            {rest.length > 50 && (
                              <div className="text-xs text-neutral-500">Ещё {rest.length - 50}</div>
                            )}
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                {/* Selected driver mini-card */}
                {chosen != null ? (
                  <div className="mt-3 p-2 rounded-lg bg-neutral-50 border border-neutral-200 text-sm flex items-center justify-between">
                    <div className="truncate" title={getDriverName(chosen)}>
                      Выбран: <span className="font-medium">{getDriverName(chosen)}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button className="text-blue-600 underline" onClick={() => onSelectDriver(chosen)}>Открыть карточку</button>
                      <button className="text-blue-600 underline" onClick={() => { highlightSegment(s.path); fitToPath(s.path) }}>Показать на карте</button>
                    </div>
                  </div>
                ) : idsSorted.length === 0 ? (
                  <div className="mt-3 text-sm text-neutral-500">Нет кандидатов. Попробуйте другой вариант пути.</div>
                ) : null}
              </div>
            )
          })}

          {selected.segments.length > 6 && !showAllSegments && (
            <button className="btn btn-ghost w-full" onClick={() => setShowAllSegments(true)}>
              Показать все сегменты (ещё {selected.segments.length - 4})
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <button
            className="btn btn-primary"
            onClick={() => {
              const parts: string[] = []
              parts.push(`Путь: ${selected.path.join(' — ')}`)
              const details = selected.segments.map((s, si) => {
                const picked = segDriver[si]
                const pickedName = picked != null ? getDriverName(picked) : '—'
                return `Отрезок ${si + 1}: ${s.path.join(' — ')} • Перевозчик: ${pickedName}`
              }).join('\n')
              const transfers = transferNodes(selected)
              const footer = `Пересадки — в узлах: ${transfers.join(', ')}`
              const text = [parts.join('\n'), details, footer].join('\n')
              navigator.clipboard?.writeText(text).catch(() => {})
            }}
          >
            Скопировать план
          </button>
          <button className="btn btn-ghost opacity-60 cursor-not-allowed" disabled title="Скоро">Закрепить в сделку</button>
        </div>

        <div className="text-xs text-neutral-500 mt-2">
          Пересадки — в узлах: {transferNodes(selected).join(', ') || '—'}
        </div>
      </div>
    </div>
  )
}
