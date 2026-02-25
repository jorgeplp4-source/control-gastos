'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * useCategories — hook que reemplaza CSV_CATEGORIES.
 *
 * Carga desde /api/categorias?flat=1 una sola vez por sesión.
 * Devuelve el mismo shape que el CSV anterior:
 *   [ { n1, n2, n3, n4, n4_id, icono, color }, ... ]
 *
 * Cache en módulo: evita refetch entre re-renders y desmontajes.
 */

let _cache = null          // caché en módulo (persiste entre montajes del hook)
let _promise = null        // promesa en vuelo (evita doble fetch)

export function useCategories() {
  const [categories, setCategories] = useState(_cache || [])
  const [loading, setLoading]       = useState(!_cache)
  const [error, setError]           = useState(null)

  const load = useCallback(async (force = false) => {
    if (_cache && !force) { setCategories(_cache); setLoading(false); return }

    if (!_promise) {
      _promise = fetch('/api/categorias?flat=1')
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then(data => {
          _cache = Array.isArray(data) ? data : []
          _promise = null
          return _cache
        })
        .catch(err => {
          _promise = null
          throw err
        })
    }

    try {
      setLoading(true)
      const data = await _promise
      setCategories(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /** Invalida el caché y recarga (útil tras crear/editar categorías) */
  const refetch = useCallback(() => {
    _cache   = null
    _promise = null
    load(true)
  }, [load])

  return { categories, loading, error, refetch }
}

/** Versión sin hook — carga directa para componentes que no usan React state */
export async function fetchCategoriesFlat() {
  if (_cache) return _cache
  const res  = await fetch('/api/categorias?flat=1')
  const data = await res.json()
  _cache = Array.isArray(data) ? data : []
  return _cache
}
