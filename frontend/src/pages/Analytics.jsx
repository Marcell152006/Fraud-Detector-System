import { useEffect, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import PageWrapper from '../components/PageWrapper'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import { useAsync } from '../hooks/useAsync'
import { getAnalytics } from '../services/api'
import { fmtPct, fmtAmount, predBadgeClass, riskBadgeClass } from '../utils/format'

const C = { fraud: '#ef4444', legit: '#22c55e', blue: '#3b82f6', orange: '#f59e0b', purple: '#8b5cf6' }
const RISK_COLORS = { High: C.fraud, Medium: C.orange, Low: C.legit }
const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: 10,
  fontSize: 12,
}

export default function Analytics() {
  const { data, loading, error, run } = useAsync(useCallback(getAnalytics, []))

  useEffect(() => { run() }, [run])

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      </PageWrapper>
    )
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="card text-red-600 text-sm">{error}</div>
      </PageWrapper>
    )
  }

  const d = data ?? {
    fraud_by_type: [], risk_distribution: [],
    prediction_history: [], fraud_percentage: [],
    top_risk_transactions: [],
  }

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* ── Row 1: Fraud by Type + Risk Distribution ─────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Grouped bar: Fraud by Transaction Type */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Fraud by Transaction Type
            </h2>
            {d.fraud_by_type.every(x => x.fraud + x.legitimate === 0) ? (
              <EmptyState icon="📊" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={d.fraud_by_type} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="fraud"      name="Fraud"      fill={C.fraud} radius={[3,3,0,0]} />
                  <Bar dataKey="legitimate" name="Legitimate" fill={C.legit} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie: Risk Distribution */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Risk Distribution
            </h2>
            {d.risk_distribution.every(x => x.value === 0) ? (
              <EmptyState icon="🥧" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={d.risk_distribution} cx="50%" cy="50%"
                    innerRadius={65} outerRadius={95} paddingAngle={3}
                    dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {d.risk_distribution.map(entry => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] ?? C.blue} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Row 2: Prediction History + Fraud Percentage ─────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Line: prediction history last 30 days */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Prediction History (Last 30 Days)
            </h2>
            {d.prediction_history.length === 0 ? (
              <EmptyState icon="📈" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={d.prediction_history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="fraud"      name="Fraud"
                    stroke={C.fraud} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="legitimate" name="Legitimate"
                    stroke={C.legit} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie: Fraud Percentage */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Fraud Percentage
            </h2>
            {d.fraud_percentage.every(x => x.value === 0) ? (
              <EmptyState icon="📉" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={d.fraud_percentage} cx="50%" cy="50%"
                    innerRadius={65} outerRadius={95} paddingAngle={3}
                    dataKey="value" nameKey="name"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    <Cell fill={C.fraud} />
                    <Cell fill={C.legit} />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={v => `${v}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Top Risk Transactions table ───────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Top 10 Highest-Risk Transactions
            </h2>
          </div>
          {d.top_risk_transactions.length === 0 ? (
            <EmptyState message="No transactions yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Rank', 'ID', 'Type', 'Amount', 'Prediction', 'Probability', 'Risk'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.top_risk_transactions.map((row, i) => (
                    <tr key={row.id} className="hover:opacity-80 transition-opacity">
                      <td className="table-cell font-bold text-center" style={{ color: 'var(--muted)' }}>
                        {i + 1}
                      </td>
                      <td className="table-cell text-xs" style={{ color: 'var(--muted)' }}>#{row.id}</td>
                      <td className="table-cell font-medium">{row.transaction_type}</td>
                      <td className="table-cell tabular-nums">{fmtAmount(row.amount)}</td>
                      <td className="table-cell">
                        <span className={predBadgeClass(row.prediction)}>{row.prediction}</span>
                      </td>
                      <td className="table-cell tabular-nums font-semibold" style={{
                        color: row.probability >= 70 ? '#ef4444' : row.probability >= 30 ? '#f59e0b' : '#22c55e'
                      }}>
                        {fmtPct(row.probability)}
                      </td>
                      <td className="table-cell">
                        <span className={riskBadgeClass(row.risk)}>{row.risk}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </PageWrapper>
  )
}
