import { QueryOperators } from "./operators"

/**
 * A type representing all string or string array fields
 */
export type StringAndStringArrayFields<T> = {
  [K in keyof T]: NonNullable<T[K]> extends string | string[] ? K : never
}[keyof T]

/**
 * An interface representing how queries should look like
 */
export interface Query<T> {
  /**
   * Filtering conditions to match documents.
   * - Supports simple equality and advanced MongoDB operators (e.g., `$gte`, `$in`, `$regex`).
   * - Use `or` or `and` to combine multiple conditions.
   *
   * Example:
   * ```typescript
   * where: {
   *   createdAt: { $gte: new Date('2024-01-01') },
   *   name: { $regex: /example/i },
   *   or: [
   *     { status: 'active' },
   *     { priority: { $gte: 5 } }
   *   ]
   * }
   * ```
   */
  where?: QueryOperators<T> | { or?: QueryOperators<T>[] } | { and?: QueryOperators<T>[] }

  /**
   * Specifies which fields to include in the result.
   * - Limits the returned fields for efficiency and clarity.
   *
   * Example:
   * ```typescript
   * select: ['name', 'createdAt']
   * ```
   */
  select?: (keyof T)[]

  /**
   * Specifies fields to join with other collections.
   * - Maps field names to the corresponding collection and selected fields.
   *
   * Example:
   * ```typescript
   * join: {
   *   createdBy: { collectionName: 'users', select: ['name', 'email'] }
   * }
   * ```
   */
  join?: Partial<Record<StringAndStringArrayFields<T>, JoinOptions>>

  /**
   * Adds conditions for joined collections.
   * - Filters the joined data based on specified conditions.
   *
   * Example:
   * ```typescript
   * joinConditions: {
   *   createdBy: { isActive: true }
   * }
   * ```
   */
  joinConditions?: Record<string, Record<string, unknown>>

  /**
   * Limits the number of documents returned.
   * - Useful for pagination or restricting large datasets.
   *
   * Example:
   * ```typescript
   * limit: 10
   * ```
   */
  limit?: number

  /**
   * Skips the specified number of documents.
   * - Used for pagination to offset results.
   *
   * Example:
   * ```typescript
   * skip: 20
   * ```
   */
  skip?: number

  /**
   * Specifies the sorting order for results.
   * - Allows sorting by multiple fields with `asc` or `desc` order.
   *
   * Example:
   * ```typescript
   * sort: {
   *   createdAt: 'desc',
   *   name: 'asc'
   * }
   * ```
   */
  sort?: Record<string, 'asc' | 'desc'>

  /**
   * Renames fields in the output.
   * - Maps original field names to more user-friendly or API-consistent aliases.
   *
   * Example:
   * ```typescript
   * aliases: {
   *   projectName: 'name',
   *   creationDate: 'createdAt'
   * }
   * ```
   */
  aliases?: Record<(keyof T), string>
}

/**
 * Options for join fields
 */
export interface JoinOptions {
  collectionName: string
  select?: string[]
}
