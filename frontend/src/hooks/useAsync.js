import { useState, useCallback } from 'react'

/**
 * Generic async action hook.
 * Returns { data, loading, error, run }
 */
export function useAsync(asyncFn) {
  const [state, setState] = useState({ data: null, loading: false, error: null })

  const run = useCallback(
    async (...args) => {
      setState({ data: null, loading: true, error: null })
      try {
        const data = await asyncFn(...args)
        setState({ data, loading: false, error: null })
        return data
      } catch (err) {
        const message =
          err?.response?.data?.detail || err?.message || 'Unexpected error'
        setState({ data: null, loading: false, error: message })
        throw err
      }
    },
    [asyncFn]
  )

  return { ...state, run }
}
