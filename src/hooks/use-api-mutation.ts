"use client"

import { useState, useCallback, useRef, useEffect } from "react"

type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE"

interface UseApiMutationOptions<TData, TPayload> {
  /** HTTP method to use */
  method?: HttpMethod
  /** Callback when mutation succeeds */
  onSuccess?: (data: TData, payload?: TPayload) => void
  /** Callback when mutation fails */
  onError?: (error: Error) => void
}

interface UseApiMutationResult<TData, TPayload> {
  /** Execute the mutation */
  mutate: (payload?: TPayload) => Promise<TData | null>
  /** Loading state */
  loading: boolean
  /** Error if mutation failed */
  error: Error | null
  /** Reset error state */
  reset: () => void
}

/**
 * Custom hook for mutations (POST, PUT, PATCH, DELETE)
 * Handles loading states, errors, and callbacks
 *
 * @example
 * ```tsx
 * const { mutate, loading, error } = useApiMutation<Account, AccountFormData>(
 *   "/api/accounts",
 *   {
 *     method: "POST",
 *     onSuccess: (account) => {
 *       toast.success("Account created!")
 *       router.push("/dashboard/accounts")
 *     },
 *   }
 * )
 *
 * const handleSubmit = async (data: AccountFormData) => {
 *   await mutate(data)
 * }
 * ```
 */
export function useApiMutation<TData = unknown, TPayload = unknown>(
  url: string,
  options?: UseApiMutationOptions<TData, TPayload>
): UseApiMutationResult<TData, TPayload> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Use ref to store latest options to avoid stale closures
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const mutate = useCallback(
    async (payload?: TPayload): Promise<TData | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(url, {
          method: optionsRef.current?.method || "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload ? JSON.stringify(payload) : undefined,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Request failed with status ${response.status}`)
        }

        const data = await response.json()
        optionsRef.current?.onSuccess?.(data, payload)
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error occurred")
        setError(error)
        optionsRef.current?.onError?.(error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [url]
  )

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return { mutate, loading, error, reset }
}

/**
 * Convenience hook for DELETE operations
 */
export function useApiDelete<TData = unknown>(
  url: string,
  options?: Omit<UseApiMutationOptions<TData, void>, "method">
): UseApiMutationResult<TData, void> {
  return useApiMutation<TData, void>(url, { ...options, method: "DELETE" })
}
