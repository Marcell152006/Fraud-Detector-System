import { motion, AnimatePresence } from 'framer-motion'
import { fmtPct, fmtAmount, riskBadgeClass, predBadgeClass, riskBarClass, riskColor } from '../utils/format'

/**
 * Animated prediction result card.
 * Shows: label, probability bar, risk, confidence, and explanation reasons.
 */
export default function PredictionResult({ result, onReset }) {
  if (!result) return null

  const isFraud = result.prediction === 'Fraud'
  const prob    = Number(result.probability)

  return (
    <AnimatePresence>
      <motion.div
        key="result"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="card"
        style={{ borderLeft: `4px solid ${isFraud ? '#ef4444' : '#22c55e'}` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${
              isFraud ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {isFraud ? '⚠️' : '✅'}
            </div>
            <div>
              <h3 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                {isFraud ? 'Fraudulent Transaction' : 'Legitimate Transaction'}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                Prediction ID #{result.id} · {fmtAmount(result.amount ?? 0)}
              </p>
            </div>
          </div>
          <button onClick={onReset} className="btn-secondary text-xs py-1.5 px-3">
            New Analysis
          </button>
        </div>

        {/* Probability bar */}
        <div className="mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: 'var(--muted)' }}>Fraud Probability</span>
            <span className={`font-bold ${riskColor(result.risk)}`}>
              {fmtPct(prob)}
            </span>
          </div>
          <div className="w-full rounded-full h-3" style={{ backgroundColor: 'var(--border)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${prob}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className={`h-3 rounded-full ${riskBarClass(result.risk)}`}
            />
          </div>
          {/* Risk scale labels */}
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted)' }}>
            <span>0% — Low</span>
            <span>30%</span>
            <span>70%</span>
            <span>100% — High</span>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Prediction</p>
            <span className={predBadgeClass(result.prediction)}>{result.prediction}</span>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Risk Level</p>
            <span className={riskBadgeClass(result.risk)}>{result.risk}</span>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Confidence</p>
            <span className="badge bg-blue-100 text-blue-700">{result.confidence}</span>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Probability</p>
            <span className={`badge ${riskBadgeClass(result.risk)}`}>{fmtPct(prob, 2)}</span>
          </div>
        </div>

        {/* Explanation */}
        {result.reasons && result.reasons.length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              🔍 Key Factors
            </p>
            <ul className="space-y-2">
              {result.reasons.map((r, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.2 }}
                  className="flex items-start gap-2 text-sm"
                  style={{ color: 'var(--text)' }}
                >
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    isFraud ? 'bg-red-400' : 'bg-green-400'
                  }`} />
                  {r}
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
