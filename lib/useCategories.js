'use client'
import { useState, useEffect, useCallback } from 'react'

let _cache       = null
let _promise     = null
const _listeners = new Set()

function notifyAll(data) {
  _listeners.forEach(fn => fn(data))
}

async function loadOnce(force) {
  if (_cache && !force) return _cache
  if (!_promise) {
    _promise = fetch('/api/categorias?flat=1')
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

export function useCategories() {
  const [categories, setCategories] = useState(_cache || [])
  const [loading, setLoading]       = useState(!_cache)
  const [error, setError]           = useState(null)

  useEffect(() => {
    const handler = (data) => setCategories(data)
    _listeners.add(handler)

    if (!_cache) {
      setLoading(true)
      loadOnce(false)
        .then(data => { setCategories(data); setLoading(false) })
        .catch(e   => { setError(e.message); setLoading(false) })
    } else {
      setCategories(_cache)
      setLoading(false)
    }

    return () => { _listeners.delete(handler) }
  }, [])

  const refetch = useCallback(() => {
    _cache = null
    _promise = null
    setLoading(true)
    loadOnce(true)
      .then(data => { setCategories(data); setLoading(false) })
      .catch(e   => { setError(e.message); setLoading(false) })
  }, [])

  return { categories, loading, error, refetch }
}

export async function fetchCategoriesFlat() {
  if (_cache) return _cache
  return loadOnce(false)
}
