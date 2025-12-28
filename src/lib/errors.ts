import { NextResponse } from "next/server"

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR"

export interface ApiErrorBody {
  error: string
  code?: ErrorCode
  details?: unknown
}

// ============================================================================
// ERROR RESPONSE FACTORY
// ============================================================================

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number,
  options?: { code?: ErrorCode; details?: unknown }
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    error: message,
  }
  if (options?.code) {
    body.code = options.code
  }
  if (options?.details) {
    body.details = options.details
  }
  return NextResponse.json(body, { status })
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * 401 Unauthorized response
 */
export function unauthorized(message = "Unauthorized"): NextResponse<ApiErrorBody> {
  return createErrorResponse(message, 401, { code: "UNAUTHORIZED" })
}

/**
 * 403 Forbidden response
 */
export function forbidden(message = "Forbidden"): NextResponse<ApiErrorBody> {
  return createErrorResponse(message, 403, { code: "FORBIDDEN" })
}

/**
 * 404 Not Found response
 */
export function notFound(resource: string): NextResponse<ApiErrorBody> {
  return createErrorResponse(`${resource} not found`, 404, { code: "NOT_FOUND" })
}

/**
 * 400 Bad Request response
 */
export function badRequest(message: string): NextResponse<ApiErrorBody> {
  return createErrorResponse(message, 400, { code: "BAD_REQUEST" })
}

/**
 * 400 Validation Error response with details
 */
export function validationError(details: unknown): NextResponse<ApiErrorBody> {
  return createErrorResponse("Validation failed", 400, {
    code: "VALIDATION_ERROR",
    details,
  })
}

/**
 * 409 Conflict response
 */
export function conflict(message: string): NextResponse<ApiErrorBody> {
  return createErrorResponse(message, 409, { code: "CONFLICT" })
}

/**
 * 500 Internal Server Error response
 */
export function internalError(message = "Internal server error"): NextResponse<ApiErrorBody> {
  return createErrorResponse(message, 500, { code: "INTERNAL_ERROR" })
}

// ============================================================================
// ERROR LOGGING HELPER
// ============================================================================

/**
 * Log an error with context and return appropriate response
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse<ApiErrorBody> {
  console.error(`Error in ${context}:`, error)

  if (error instanceof Error) {
    // Don't expose internal error details in production
    return internalError()
  }

  return internalError()
}
