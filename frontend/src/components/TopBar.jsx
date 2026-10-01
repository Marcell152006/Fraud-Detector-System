import { useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const titles = {
  '/dashboard': { title: 'Dashboard',            sub: 'Overview of fraud detection metrics' },
  '/predict':   { title: 'Analyze Transaction',  sub: 'Single transaction fraud analysis' },
  '/upload':    { title: 'Batch Upload',          sub: 'Process multiple transactions via CSV' },
  '/history':   { title: 'Prediction History',   sub: 'All stored prediction records' },
  '/analytics': { title: 'Analytics',            sub: 'Deep-dive fraud pattern analysis' },
}

export default function TopBar() {
  const { pathname } = useLocation()
  const { dark, toggle } = useTheme()
  const meta = titles[pathname] ?? { title: 'FraudShield', sub: '' }

  return (
    <header
      className="px-6 py-4 flex items-center justify-between flex-shrink-0"
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Page title */}
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{meta.title}</h1>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{meta.sub}</p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* API status */}
        <div
          className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
          style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          API Online
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 hover:opacity-80"
          style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          {dark ? (
            /* Sun icon */
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            /* Moon icon */
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
