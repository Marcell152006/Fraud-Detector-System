/**
 * Format a 0-100 probability percentage.
 */
export const fmtPct = (pct, digits = 1) =>
  `${Number(pct).toFixed(digits)}%`

/**
 * Format an ISO date string to a readable locale string.
 */
export const fmtDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

/**
 * Format a number as a currency string.
 */
export const fmtAmount = (n) =>
  `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

/**
 * Return the badge CSS class for a given prediction string.
 */
export const predBadgeClass = (pred) =>
  pred === 'Fraud' ? 'badge-fraud' : 'badge-legit'

/**
 * Return the badge CSS class for a given risk level.
 */
export const riskBadgeClass = (risk) => {
  switch ((risk || '').toLowerCase()) {
    case 'high':   return 'badge-high'
    case 'medium': return 'badge-medium'
    default:       return 'badge-low'
  }
}

/**
 * Return a Tailwind text-color class for a risk level.
 */
export const riskColor = (risk) => {
  switch ((risk || '').toLowerCase()) {
    case 'high':   return 'text-red-500'
    case 'medium': return 'text-orange-500'
    default:       return 'text-green-500'
  }
}

/**
 * Return the bar CSS class for the risk probability fill bar.
 */
export const riskBarClass = (risk) => {
  switch ((risk || '').toLowerCase()) {
    case 'high':   return 'risk-bar-high'
    case 'medium': return 'risk-bar-medium'
    default:       return 'risk-bar-low'
  }
}

/**
 * Trigger a browser download from a Blob.
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
