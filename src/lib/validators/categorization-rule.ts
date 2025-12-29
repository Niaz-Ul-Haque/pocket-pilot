import { z } from "zod"

// Rule types
export const RULE_TYPES = ["contains", "starts_with", "ends_with", "exact", "regex"] as const
export type RuleType = (typeof RULE_TYPES)[number]

// Human-readable labels for rule types
export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  contains: "Contains",
  starts_with: "Starts with",
  ends_with: "Ends with",
  exact: "Exact match",
  regex: "Regex pattern",
}

// Base fields for categorization rule
const categorizationRuleBase = {
  name: z
    .string()
    .min(1, "Rule name is required")
    .max(100, "Rule name is too long")
    .trim(),
  rule_type: z.enum(RULE_TYPES, {
    message: "Please select a rule type",
  }),
  pattern: z
    .string()
    .min(1, "Pattern is required")
    .max(255, "Pattern is too long"),
  target_category_id: z.string().uuid("Please select a category"),
}

// Schema for API requests (defaults applied server-side)
export const categorizationRuleSchema = z.object({
  ...categorizationRuleBase,
  case_sensitive: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

// Schema for form with required booleans (no defaults)
export const categorizationRuleFormSchema = z.object({
  ...categorizationRuleBase,
  case_sensitive: z.boolean(),
  is_active: z.boolean(),
})

// Schema for updating a categorization rule
export const categorizationRuleUpdateSchema = categorizationRuleSchema.partial()

// Type for form (all fields required)
export type CategorizationRuleFormData = z.infer<typeof categorizationRuleFormSchema>

// Full categorization rule type including database fields
export type CategorizationRule = {
  id: string
  user_id: string
  name: string
  rule_order: number
  rule_type: RuleType
  pattern: string
  case_sensitive: boolean
  target_category_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Categorization rule with joined category name
export type CategorizationRuleWithCategory = CategorizationRule & {
  category_name?: string
}

// Schema for reordering rules
export const reorderRulesSchema = z.object({
  rule_ids: z.array(z.string().uuid()).min(1, "At least one rule is required"),
})

// Schema for applying rules to existing transactions
export const applyRulesSchema = z.object({
  uncategorized_only: z.boolean().default(true),
  dry_run: z.boolean().default(false),
})

export type ApplyRulesFormData = z.infer<typeof applyRulesSchema>

// Result of applying rules
export type ApplyRulesResult = {
  total_checked: number
  total_matched: number
  matches: Array<{
    transaction_id: string
    description: string
    rule_name: string
    category_name: string
  }>
}

/**
 * Test if a description matches a rule
 */
export function testRule(
  description: string,
  ruleType: RuleType,
  pattern: string,
  caseSensitive: boolean
): boolean {
  const testDesc = caseSensitive ? description : description.toLowerCase()
  const testPattern = caseSensitive ? pattern : pattern.toLowerCase()

  switch (ruleType) {
    case "contains":
      return testDesc.includes(testPattern)
    case "starts_with":
      return testDesc.startsWith(testPattern)
    case "ends_with":
      return testDesc.endsWith(testPattern)
    case "exact":
      return testDesc === testPattern
    case "regex":
      try {
        const regex = new RegExp(pattern, caseSensitive ? "" : "i")
        return regex.test(description)
      } catch {
        return false
      }
    default:
      return false
  }
}
