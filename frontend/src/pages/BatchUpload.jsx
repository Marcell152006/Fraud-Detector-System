import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../components/PageWrapper'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import { useAsync } from '../hooks/useAsync'
import { uploadCSV, downloadBatchCSV } from '../services/api'
import { fmtPct, fmtAmount, predBadgeClass, riskBadgeClass, downloadBlob } from '../utils/format'

export default function BatchUpload() {
  const [file, setFile]         = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const inputRef = useRef()
  const { data, loading, error, run } = useAsync(useCallback(uploadCSV, []))

  const handleFile = f => {
    if (f?.name?.endsWith('.csv')) setFile(f)
  }

  const handleDrop = e => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!file) return
    await run(file)
  }

  const handleDownload = async () => {
    if (!data?.batch_id) return
    setDownloading(true)
    try {
      const blob = await downloadBatchCSV(data.batch_id)
      downloadBlob(blob, `batch_${data.batch_id}.csv`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Upload card */}
        <div className="card">
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Upload CSV File
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            Required columns: <code className="text-xs px-1 py-0.5 rounded"
              style={{ backgroundColor: 'var(--border)' }}>
              step, type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest
            </code>
          </p>

          <form onSubmit={handleSubmit}>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current.click()}
              className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-150"
              style={{
                borderColor: dragOver ? '#3b82f6' : 'var(--border)',
                backgroundColor: dragOver ? 'rgba(59,130,246,0.04)' : 'var(--bg)',
              }}
            >
              <input
                ref={inputRef} type="file" accept=".csv" className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
              <div className="flex flex-col items-center gap-3" style={{ color: 'var(--muted)' }}>
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {file ? (
                  <p className="text-sm font-semibold text-blue-500">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
                    <p className="text-xs">Supports .csv files only</p>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-3 text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3">{error}</div>
            )}

            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={!file || loading} className="btn-primary">
                {loading ? <Spinner size="sm" /> : '🚀'}
                {loading ? 'Processing…' : 'Run Batch Prediction'}
              </button>
              {file && (
                <button type="button" className="btn-secondary"
                  onClick={() => { setFile(null); inputRef.current.value = '' }}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Results */}
        <AnimatePresence>
          {data && (
            <motion.div key="results"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Processed', value: data.total,              color: 'var(--text)' },
                  { label: 'Fraud Detected',  value: data.fraud_count,        color: '#ef4444' },
                  { label: 'Legitimate',       value: data.legitimate_count,   color: '#22c55e' },
                  { label: 'Fraud Rate',       value: `${data.fraud_rate}%`,   color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="card text-center">
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Download button */}
              <div className="flex justify-end">
                <button onClick={handleDownload} disabled={downloading} className="btn-secondary text-sm">
                  {downloading ? <Spinner size="sm" /> : '⬇'}
                  {downloading ? 'Downloading…' : 'Download Results CSV'}
                </button>
              </div>

              {/* Results table */}
              <div className="card p-0 overflow-x-auto">
                {(data.results ?? []).length === 0 ? (
                  <EmptyState message="No results" />
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          {['#', 'Amount', 'Prediction', 'Probability', 'Risk', 'Confidence'].map(h => (
                            <th key={h} className="table-header">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(data.results ?? []).slice(0, 100).map((row, i) => (
                          <tr key={i} className="hover:opacity-80 transition-opacity">
                            <td className="table-cell" style={{ color: 'var(--muted)' }}>{i + 1}</td>
                            <td className="table-cell font-medium">{fmtAmount(row.amount ?? 0)}</td>
                            <td className="table-cell">
                              <span className={predBadgeClass(row.prediction)}>{row.prediction}</span>
                            </td>
                            <td className="table-cell tabular-nums">{fmtPct(row.probability)}</td>
                            <td className="table-cell">
                              <span className={riskBadgeClass(row.risk)}>{row.risk}</span>
                            </td>
                            <td className="table-cell" style={{ color: 'var(--muted)' }}>{row.confidence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(data.results ?? []).length > 100 && (
                      <p className="text-xs text-center py-3" style={{ color: 'var(--muted)' }}>
                        Showing first 100 of {data.results.length} rows. Download CSV for all.
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}
