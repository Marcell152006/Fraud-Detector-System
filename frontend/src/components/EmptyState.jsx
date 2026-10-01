/** Empty state shown when a data section has no records yet. */
export default function EmptyState({ message = 'No data yet', icon = '📭' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-5xl">{icon}</span>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{message}</p>
    </div>
  )
}
