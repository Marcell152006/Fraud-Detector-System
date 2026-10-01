import { useState, useCallback } from 'react'
import PageWrapper from '../components/PageWrapper'
import PredictionResult from '../components/PredictionResult'
import Spinner from '../components/Spinner'
import { useAsync } from '../hooks/useAsync'
import { predictSingle } from '../services/api'

// ── Form field config ─────────────────────────────────────────────────────────
const FIELDS = [
  { name: 'step',           label: 'Step',              placeholder: '250',       hint: '1 step = 1 hour' },
  { name: 'amount',         label: 'Amount ($)',         placeholder: '500000',    hint: 'Transaction amount' },
  { name: 'oldbalanceOrg',  label: 'Sender Balance Before', placeholder: '1000000', hint: 'Original balance' },
  { name: 'newbalanceOrig', label: 'Sender Balance After',  placeholder: '500000',  hint: 'After transaction' },
  { name: 'oldbalanceDest', label: 'Receiver Balance Before', placeholder: '100000', hint: 'Before transaction' },
  { name: 'newbalanceDest', label: 'Receiver Balance After',  placeholder: '600000', hint: 'After transaction' },
]

const TYPE_OPTIONS = ['CASH_IN', 'CASH_OUT', 'DEBIT', 'PAYMENT', 'TRANSFER']
const DEFAULT_FORM = Object.fromEntries([
  ...FIELDS.map(f => [f.name, '']),
  ['type', 'TRANSFER'],
  ['isFlaggedFraud', '0'],
])

// Quick-fill examples
const EXAMPLES = {
  'Suspicious Transfer': {
    step: '250', type: 'TRANSFER', amount: '500000',
    oldbalanceOrg: '1000000', newbalanceOrig: '0',
    oldbalanceDest: '0', newbalanceDest: '500000', isFlaggedFraud: '0',
  },
  'Normal Payment': {
    step: '10', type: 'PAYMENT', amount: '250',
    oldbalanceOrg: '5000', newbalanceOrig: '4750',
    oldbalanceDest: '10000', newbalanceDest: '10250', isFlaggedFraud: '0',
  },
}

export default function SinglePrediction() {
  const [form, setForm]       = useState(DEFAULT_FORM)
  const [result, setResult]   = useState(null)
  const { loading, error, run } = useAsync(useCallback(predictSingle, []))

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    const payload = {
      step:           parseFloat(form.step) || 0,
      type:           form.type,
      amount:         parseFloat(form.amount) || 0,
      oldbalanceOrg:  parseFloat(form.oldbalanceOrg) || 0,
      newbalanceOrig: parseFloat(form.newbalanceOrig) || 0,
      oldbalanceDest: parseFloat(form.oldbalanceDest) || 0,
      newbalanceDest: parseFloat(form.newbalanceDest) || 0,
      isFlaggedFraud: parseFloat(form.isFlaggedFraud) || 0,
    }
    const data = await run(payload)
    if (data) {
      // Attach amount for display in result card
      setResult({ ...data, amount: payload.amount })
    }
  }

  const handleReset = () => {
    setForm(DEFAULT_FORM)
    setResult(null)
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Form */}
        <div className="card">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                Transaction Details
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                Enter all fields and click Analyze to predict fraud.
              </p>
            </div>
            {/* Quick-fill buttons */}
            <div className="flex gap-2">
              {Object.entries(EXAMPLES).map(([label, vals]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setForm({ ...DEFAULT_FORM, ...vals })}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150"
                  style={{
                    backgroundColor: 'var(--border)',
                    color: 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Transaction Type */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                Transaction Type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="select-field w-full"
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Numeric fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FIELDS.map(f => (
                <div key={f.name}>
                  <label htmlFor={f.name} className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--muted)' }}>
                    {f.label}
                    <span className="ml-1 font-normal" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                      ({f.hint})
                    </span>
                  </label>
                  <input
                    id={f.name} name={f.name} type="number" step="any"
                    required placeholder={f.placeholder}
                    value={form[f.name]} onChange={handleChange}
                    className="input-field"
                  />
                </div>
              ))}
            </div>

            {/* isFlaggedFraud */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                System Fraud Flag
              </label>
              <select name="isFlaggedFraud" value={form.isFlaggedFraud}
                onChange={handleChange} className="select-field w-40">
                <option value="0">0 — Not flagged</option>
                <option value="1">1 — Flagged</option>
              </select>
            </div>

            {error && (
              <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <Spinner size="sm" /> : '🔍'}
                {loading ? 'Analyzing…' : 'Analyze Transaction'}
              </button>
              <button type="button" onClick={handleReset} className="btn-secondary">
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Result */}
        <PredictionResult result={result} onReset={handleReset} />
      </div>
    </PageWrapper>
  )
}
