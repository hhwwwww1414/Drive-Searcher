import React, { useState } from 'react'
import CarrierFinderApp from './components/CarrierFinderApp'
import RatingsPage from './components/RatingsPage'

export default function App() {
  const [page, setPage] = useState<'finder' | 'ratings'>('finder')

  return (
    <div className="min-h-screen py-6 md:py-10">
      <nav className="mb-6 px-4 flex gap-4">
        <button
          className={`underline ${page === 'finder' ? 'font-semibold' : ''}`}
          onClick={() => setPage('finder')}
        >
          Поиск
        </button>
        <button
          className={`underline ${page === 'ratings' ? 'font-semibold' : ''}`}
          onClick={() => setPage('ratings')}
        >
          Рейтинги
        </button>
      </nav>
      {page === 'finder' ? <CarrierFinderApp /> : <RatingsPage />}
    </div>
  )
}

