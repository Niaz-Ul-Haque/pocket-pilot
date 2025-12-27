"use client"

import { useState, useCallback } from "react"
import { z } from "zod"

type FieldErrors = Record<string, string[]>

interface UseFormErrorsResult<T extends Record<string, unknown>> {
  /** Field-level errors */
  errors: FieldErrors
  /** Check if a specific field has errors */
  hasError: (field: keyof T) => boolean
  /** Get first error message for a field */
  getError: (field: keyof T) => string | undefined
  /** Validate data against schema */
  validate: (data: T) => Promise<boolean>
  /** Set errors manually (e.g., from API response) */
  setErrors: (errors: FieldErrors) => void
  /** Set a single field error */
  setFieldError: (field: keyof T, message: string) => void
  /** Clear all errors */
  clearErrors: () => void
  /** Clear error for specific field */
  clearFieldError: (field: keyof T) => void
}

/**
 * Custom hook for form validation with Zod
 * Handles field-level errors and validation
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   name: z.string().min(1, "Name is required"),
 *   email: z.string().email("Invalid email"),
 * })
 *
 * const { errors, validate, getError, clearErrors } = useFormErrors(schema)
 *
 * const handleSubmit = async (data: FormData) => {
 *   if (await validate(data)) {
 *     // Submit form
 *   }
 * }
 *
 * return (
 *   <form onSubmit={handleSubmit}>
 *     <Input name="email" />
 *     {getError("email") && <span className="error">{getError("email")}</span>}
 *   </form>
 * )
 * ```
 */
export function useFormErrors<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>
): UseFormErrorsResult<T> {
  const [errors, setErrorsState] = useState<FieldErrors>({})

  const validate = useCallback(
    async (data: T): Promise<boolean> => {
      const result = schema.safeParse(data)

      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors as FieldErrors
        setErrorsState(fieldErrors)
        return false
      }

      setErrorsState({})
      return true
    },
    [schema]
  )

  const hasError = useCallback(
    (field: keyof T): boolean => {
      return !!errors[field as string]?.length
    },
    [errors]
  )

  const getError = useCallback(
    (field: keyof T): string | undefined => {
      return errors[field as string]?.[0]
    },
    [errors]
  )

  const setErrors = useCallback((newErrors: FieldErrors) => {
    setErrorsState(newErrors)
  }, [])

  const setFieldError = useCallback((field: keyof T, message: string) => {
    setErrorsState((prev) => ({
      ...prev,
      [field as string]: [message],
    }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrorsState({})
  }, [])

  const clearFieldError = useCallback((field: keyof T) => {
    setErrorsState((prev) => {
      const next = { ...prev }
      delete next[field as string]
      return next
    })
  }, [])

  return {
    errors,
    hasError,
    getError,
    validate,
    setErrors,
    setFieldError,
    clearErrors,
    clearFieldError,
  }
}
