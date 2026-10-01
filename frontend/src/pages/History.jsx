import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import PageWrapper from '../components/PageWrapper'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import { useAsync } from '../hooks/useAsync'
import { getHistory, deleteRecord } from '../services/api'
import { fmtPct, fmtAmount, fmtDate, predBadgeClass, riskBadgeClass } from '../utils/format'

export default function History() {
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [filters, setFilters] = useState({ prediction: '', risk: '', source: '' })
  const [deletingId, setDeletingId] = useState(null)

  const fetcher = useCallback(params => getHistory(params), [])
  const { data, loading, error, run } = useAsync(fetcher)

  const fetch = useCallback(() => {
    const params = { page, page_size: 20 }
    if (search)             params.search     = search
    if (filters.prediction) params.prediction = filters.prediction
    if (filters.risk)       params.risk       = filters.risk
    if (filters.source)     params.source     = filters.source
    run(params)
  }, [page, search, filters, run])

  useEffect(() => { fetch() }, [fetch])

  const handleDelete = async id => {
    if (!window.confirm('Delete this record?')) return
    setDeletingId(id)
    try { await deleteRecord(id); fetch() }
    finally { setDeletingId(null) }
  }

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }))
    setPage(1)
  }

  const items  = data?.items ?? []
  const total  = data?.total ?? 0
  const pages  = data?.total_pages ?? 1

  return (
    <PageWrapper>
      <div className="space-y-4">

        {/* Filters */}
        <div className="card flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type, prediction, risk…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="input-field pr-9"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: 'var(--muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Prediction filter */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Prediction</label>
            <select value={filters.prediction}
              onChange={e => handleFilterChange('prediction', e.target.value)}
              className="select-field w-36">
              <option value="">All</option>
              <option value="Fraud">Fraud</option>
              <option value="Legitimate">Legitimate</option>
            </select>
          </div>

          {/* Risk filter */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Risk</label>
            <select value={filters.risk}
              onChange={e => handleFilterChange('risk', e.target.value)}
              className="select-field w-32">
              <option value="">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Source filter */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Source</label>
            <select value={filters.source}
              onChange={e => handleFilterChange('source', e.target.value)}
              className="select-field w-32">
              <option value="">All</option>
              <option value="single">Single</option>
              <option value="batch">Batch</option>
            </select>
          </div>

          <button onClick={fetch} className="btn-secondary text-sm">
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {total} record{total !== 1 ? 's' : ''} found
            </p>
            {loading && <Spinner size="sm" />}
          </div>

          {error && (
            <div className="px-6 py-4 text-sm text-red-600">{error}</div>
          )}

          {!loading && items.length === 0 && !error && (
            <EmptyState message="No records found for the selected filters." />
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['ID', 'Date', 'Source', 'Type', 'Amount', 'Prediction', 'Prob', 'Risk', 'Confidence', ''].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <td className="table-cell text-xs" style={{ color: 'var(--muted)' }}>#{row.id}</td>
                      <td className="table-cell text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                        {fmtDate(row.created_at)}
                      </td>
                      <td className="table-cell">
                        <span className="text-xs px-2 py-0.5 rounded capitalize"
                          style={{ backgroundColor: 'var(--border)', color: 'var(--muted)' }}>
                          {row.source}
                        </span>
                      </td>
                      <td className="table-cell font-medium">{row.transaction_type}</td>
                      <td className="table-cell tabular-nums">{fmtAmount(row.amount)}</td>
                      <td className="table-cell">
                        <span className={predBadgeClass(row.prediction)}>{row.prediction}</span>
                      </td>
                      <td className="table-cell tabular-nums">{fmtPct(row.probability)}</td>
                      <td className="table-cell">
                        <span className={riskBadgeClass(row.risk)}>{row.risk}</span>
                      </td>
                      <td className="table-cell" style={{ color: 'var(--muted)' }}>{row.confidence}</td>
                      <td className="table-cell">
                        <button onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="btn-danger">
                          {deletingId === row.id ? '…' : 'Delete'}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1.5 px-3 text-xs">
                ← Prev
              </button>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1.5 px-3 text-xs">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
