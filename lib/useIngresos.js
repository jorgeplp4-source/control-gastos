'use client'
import { useState, useEffect, useCallback } from 'react'

let _cache    = null
let _promise  = null
const _listeners = new Set()

function notifyAll(data) { _listeners.forEach(fn => fn(data)) }

async function loadAll(force) {
  if (_cache && !force) return _cache
  if (!_promise) {
    _promise = fetch('/api/ingresos')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then(data => {
        _cache = Array.isArray(data) ? data : []
        _promise = null
        notifyAll(_cache)
        return _cache
      })
      .catch(err => { _promise = null; throw err })
  }
  return _promise
}

export function useIngresos() {
  const [ingresos, setIngresos] = useState(_cache || [])
  const [loading,  setLoading]  = useState(!_cache)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    const handler = data => setIngresos(data)
    _listeners.add(handler)
    if (!_cache) {
      setLoading(true)
      loadAll(false)
        .then(d => { setIngresos(d); setLoading(false) })
        .catch(e => { setError(e.message); setLoading(false) })
    } else {
      setIngresos(_cache); setLoading(false)
    }
    return () => _listeners.delete(handler)
  }, [])

  const refetch = useCallback(() => {
    _cache = null; _promise = null
    setLoading(true)
    return loadAll(true)
      .then(d => { setIngresos(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return { ingresos, loading, error, refetch }
}
