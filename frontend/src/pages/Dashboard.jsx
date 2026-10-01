import { useEffect, useCallback } from 'react'
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import PageWrapper from '../components/PageWrapper'
import StatCard from '../components/StatCard'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'
import { useAsync } from '../hooks/useAsync'
import { getDashboard } from '../services/api'
import { fmtPct, fmtAmount, predBadgeClass, riskBadgeClass, fmtDate } from '../utils/format'

// ── Chart colours ─────────────────────────────────────────────────────────────
const C = {
  fraud:   '#ef4444',
  legit:   '#22c55e',
  blue:    '#3b82f6',
  high:    '#ef4444',
  medium:  '#f59e0b',
  low:     '#22c55e',
}
const PIE_COLORS = [C.fraud, C.legit]

// ── Recharts shared tooltip style (works in dark mode via CSS vars) ───────────
const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: 10,
  fontSize: 12,
}

export default function Dashboard() {
  const { data, loading, error, run } = useAsync(useCallback(getDashboard, []))

  useEffect(() => { run() }, [run])

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="card border-red-200 text-red-600 text-sm">{error}</div>
      </PageWrapper>
    )
  }

  const d = data ?? {
    total_predictions: 0, fraud_count: 0, legitimate_count: 0, fraud_rate: 0,
    high_risk_count: 0, medium_risk_count: 0, low_risk_count: 0,
    recent_predictions: [], pie_data: [], bar_data: [], line_data: [], monthly_trend: [],
  }

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Predictions"
            value={d.total_predictions.toLocaleString()}
            icon="🔢"
            accentClass="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Fraud Detected"
            value={d.fraud_count.toLocaleString()}
            icon="⚠️"
            accentClass="bg-red-100 text-red-600"
            sub={`${d.fraud_rate.toFixed(1)}% of total`}
          />
          <StatCard
            label="Legitimate"
            value={d.legitimate_count.toLocaleString()}
            icon="✅"
            accentClass="bg-green-100 text-green-700"
          />
          <StatCard
            label="Fraud Rate"
            value={`${d.fraud_rate.toFixed(1)}%`}
            icon="📊"
            accentClass={d.fraud_rate > 20 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}
          />
        </div>

        {/* ── Pie + Bar row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Pie: Fraud vs Legitimate */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Fraud Distribution
            </h2>
            {d.pie_data.every(p => p.value === 0) ? (
              <EmptyState message="No predictions yet" icon="🥧" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={d.pie_data} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    paddingAngle={3} dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {d.pie_data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar: Fraud by Transaction Type */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Fraud by Transaction Type
            </h2>
            {d.bar_data.every(b => b.fraud + b.legitimate === 0) ? (
              <EmptyState message="No data yet" icon="📊" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.bar_data} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="fraud"      name="Fraud"      fill={C.fraud} radius={[3,3,0,0]} />
                  <Bar dataKey="legitimate" name="Legitimate" fill={C.legit} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Line + Monthly row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Line: Daily predictions last 14 days */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Daily Prediction Volume (Last 14 Days)
            </h2>
            {d.line_data.length === 0 ? (
              <EmptyState message="No data yet" icon="📈" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={d.line_data}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.blue} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" name="Predictions"
                    stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Area: Monthly Trend */}
          <div className="card">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Monthly Trend (Last 6 Months)
            </h2>
            {d.monthly_trend.length === 0 ? (
              <EmptyState message="No data yet" icon="📅" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.monthly_trend}>
                  <defs>
                    <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.fraud} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.fraud} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="legitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.legit} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.legit} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="fraud"      name="Fraud"
                    stroke={C.fraud} fill="url(#fraudGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="legitimate" name="Legitimate"
                    stroke={C.legit} fill="url(#legitGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Recent Predictions table ──────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Recent Predictions</h2>
          </div>
          {d.recent_predictions.length === 0 ? (
            <EmptyState message="No predictions yet" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['ID', 'Type', 'Amount', 'Prediction', 'Probability', 'Risk'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.recent_predictions.map(r => (
                  <tr key={r.id} className="hover:opacity-80 transition-opacity">
                    <td className="table-cell text-xs" style={{ color: 'var(--muted)' }}>#{r.id}</td>
                    <td className="table-cell font-medium">{r.transaction_type}</td>
                    <td className="table-cell">{fmtAmount(r.amount)}</td>
                    <td className="table-cell">
                      <span className={predBadgeClass(r.prediction)}>{r.prediction}</span>
                    </td>
                    <td className="table-cell tabular-nums">{fmtPct(r.probability)}</td>
                    <td className="table-cell">
                      <span className={riskBadgeClass(r.risk)}>{r.risk}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </PageWrapper>
  )
}
