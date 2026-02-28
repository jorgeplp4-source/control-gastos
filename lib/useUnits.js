'use client'
import { useState, useEffect, useCallback } from 'react'

let _cache   = null
let _promise = null
const RELOAD_EVENT = 'units:reload'

async function _fetch() {
  if (!_promise) {
    _promise = fetch('/api/units')
      .then(r => r.json())
      .then(data => { _cache = Array.isArray(data) ? data : []; _promise = null; return _cache })
      .catch(err => { _promise = null; throw err })
  }
  return _promise
}

export function useUnits() {
  const [units,   setUnits]   = useState(_cache ? _cache.map(u => u.nombre) : [])
  const [allUnits, setAll]    = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  const load = useCallback(async (force = false) => {
    if (_cache && !force) { setUnits(_cache.map(u => u.nombre)); setAll(_cache); setLoading(false); return }
    try {
      setLoading(true)
      const data = await _fetch()
      setUnits(data.map(u => u.nombre))
      setAll(data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const handler = () => load(true)
    window.addEventListener(RELOAD_EVENT, handler)
    return () => window.removeEventListener(RELOAD_EVENT, handler)
  }, [load])

  const refetch = useCallback(() => {
    _cache = null; _promise = null
    window.dispatchEvent(new CustomEvent(RELOAD_EVENT))
  }, [])

  return { units, allUnits, loading, refetch }
}
