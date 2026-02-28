'use client'
import { useState, useEffect, useCallback } from 'react'

let _cache   = null
let _promise = null
const _listeners = new Set()

function notifyAll(data) { _listeners.forEach(fn => fn(data)) }

async function loadAll(force) {
  if (_cache && !force) return _cache
  if (!_promise) {
    // Traer todos los ítems sin filtro de búsqueda
    _promise = fetch('/api/items/all')
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

export function useItems() {
  const [items,   setItems]   = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const handler = data => setItems(data)
    _listeners.add(handler)

    if (!_cache) {
      setLoading(true)
      loadAll(false)
        .then(data => { setItems(data); setLoading(false) })
        .catch(e   => { setError(e.message); setLoading(false) })
    } else {
      setItems(_cache)
      setLoading(false)
    }

    return () => _listeners.delete(handler)
  }, [])

  const refetch = useCallback(() => {
    _cache = null; _promise = null
    setLoading(true)
    loadAll(true)
      .then(data => { setItems(data); setLoading(false) })
      .catch(e   => { setError(e.message); setLoading(false) })
  }, [])

  return { items, loading, error, refetch }
}
