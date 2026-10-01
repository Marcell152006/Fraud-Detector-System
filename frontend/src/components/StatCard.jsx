import { motion } from 'framer-motion'

/**
 * KPI stat card with accent icon and animated hover.
 */
export default function StatCard({ label, value, sub, icon, accentClass = 'bg-blue-100 text-blue-600' }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.15 }}
      className="card flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${accentClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold truncate" style={{ color: 'var(--text)' }}>{value}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
    </motion.div>
  )
}
