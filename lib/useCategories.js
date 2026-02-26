'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * useCategories — carga desde /api/categorias?flat=1
 * 
 * Cache compartido en módulo. Cuando cualquier componente llama refetch(),
 * un evento global notifica a TODOS los consumidores activos para que
 * recarguen su estado local.
 */

let _cache   = null
let _promise = null
const RELOAD_EVENT = 'categories:reload'

async function _fetchFromApi() {
  if (!_promise) {
    _promise = fetch('/api/categorias?flat=1')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { _cache = Array.isArray(data) ? data : []; _promise = null; return _cache })
      .catch(err => { _promise = null; throw err })
  }
  return _promise
}

export function useCategories() {
  const [categories, setCategories] = useState(_cache || [])
  const [loading, setLoading]       = useState(!_cache)
  const [error, setError]           = useState(null)

  const load = useCallback(async (force = false) => {
    if (_cache && !force) { setCategories(_cache); setLoading(false); return }
    try {
      setLoading(true)
      const data = await _fetchFromApi()
      setCategories(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Escuchar eventos de recarga globales (emitidos por refetch)
    const handler = () => load(true)
    window.addEventListener(RELOAD_EVENT, handler)
    return () => window.removeEventListener(RELOAD_EVENT, handler)
  }, [load])

  /** Invalida caché y notifica a TODOS los consumidores activos */
  const refetch = useCallback(() => {
    _cache   = null
    _promise = null
    // Notificar a todos los useCategories montados en el árbol
    window.dispatchEvent(new CustomEvent(RELOAD_EVENT))
  }, [])

  return { categories, loading, error, refetch }
}

export async function fetchCategoriesFlat() {
  if (_cache) return _cache
  return _fetchFromApi()
}
