import { WherePredicate } from './query'

/**
 * Query interface for aggregate operations.
 * Uses the same intuitive style as `findMultipleData` with `where`, `compute`, etc.
 */
export interface AggregateQuery<T> {
  /**
   * Filtering conditions applied before grouping.
   * Uses the same `WherePredicate<T>` as `findMultipleData`.
   *
   * Example:
   * ```typescript
   * where: { status: 'active' }
   * ```
   */
  where?: WherePredicate<T>

  /**
   * The field to group by.
   * Use `null` or omit to group all documents together.
   * Use `'$fieldName'` to group by a specific field.
   *
   * Example:
   * ```typescript
   * groupBy: '$status'        // group by status field
   * groupBy: '$category'      // group by category field
   * groupBy: null             // single group (all documents)
   * ```
   */
  groupBy?: string | null

  /**
   * Computed fields to calculate per group.
   * Supports `$sum`, `$avg`, `$min`, `$max`, `$count`, etc.
   * Field references use `$` prefix (e.g., `'$amount'`).
   *
   * Example:
   * ```typescript
   * compute: {
   *   total: { $sum: '$amount' },
   *   avg: { $avg: '$amount' },
   *   count: { $sum: 1 }
   * }
   * ```
   */
  compute?: Record<string, Record<string, unknown> | number | string>

  /**
   * Sorting order for the grouped results.
   * References computed fields or the `_id` group key.
   *
   * Example:
   * ```typescript
   * sort: { total: 'desc' }
   * ```
   */
  sort?: Record<string, 'asc' | 'desc'>

  /**
   * Limits the number of grouped results returned.
   */
  limit?: number
}
