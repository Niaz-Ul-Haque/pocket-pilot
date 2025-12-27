"use client"

import { useState, useEffect, useCallback } from "react"

interface UseApiQueryOptions<T> {
  /** Skip the initial fetch */
  skip?: boolean
  /** Callback when fetch succeeds */
  onSuccess?: (data: T) => void
  /** Callback when fetch fails */
  onError?: (error: Error) => void
  /** Dependencies to trigger refetch */
  deps?: unknown[]
}

interface UseApiQueryResult<T> {
  /** The fetched data */
  data: T | null
  /** Loading state */
  loading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Manually refetch data */
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching data from API endpoints
 * Handles loading states, errors, and refetching
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useApiQuery<Account[]>("/api/accounts")
 *
 * if (loading) return <Skeleton />
 * if (error) return <Error message={error.message} />
 * return <AccountList accounts={data ?? []} />
 * ```
 */
export function useApiQuery<T = unknown>(
  url: string,
  options?: UseApiQueryOptions<T>
): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const json = await response.json()
      setData(json)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred")
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (options?.skip) return
    fetchData()
  }, [fetchData, options?.skip])

  return { data, loading, error, refetch: fetchData }
}
