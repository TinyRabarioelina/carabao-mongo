import { MongoClient, ClientSession } from "mongodb"
import { PaginatedResult } from "./paginated.result"
import { Query, WherePredicate } from "./query"
import { AggregateQuery } from "./aggregate"

/**
 * An interface representing a MongoDB collection and its common operations.
 * Provides methods for manipulating data within a specific collection.
 */
export interface Collection<T> {
  /**
   * Inserts a single record into the collection.
   * @param data - The data object to insert.
   * @param uniqueFields - Optional array of field names to enforce uniqueness.
   * @returns A promise that resolves to the unique ID of the inserted record.
   */
  insertData: (
    info: { data: Omit<T, 'uuid'>, uniqueFields?: (keyof T)[]},
    session?: ClientSession
  ) => Promise<string>

 /**
  * 
  * @param info 
  * @param session 
  * @returns 
  */
  insertMultipleData: (
    datas: {datas: Omit<T, 'uuid'>[], uniqueFields?: (keyof T)[]},
    session?: ClientSession
  ) => Promise<string[]>

  /**
   * Updates records matching the given query.
   * @param predicate - The filter specifying which records to delete.
   * @param data - The updated data to apply.
   * @param uniqueFields - Optional array of field names to enforce uniqueness.
   * @returns A promise that resolves to the number of datas updated when the update is complete.
   */
  updateData: (
    predicate: { where: WherePredicate<T>, data: Partial<Omit<T, 'uuid'>>, uniqueFields?: (keyof T)[] },
    session?: ClientSession
  ) => Promise<number>

  /**
   * Deletes all records matching the given predicate.
   * @param predicate - The filter specifying which records to delete.
   * @returns A promise that resolves to the number of deleted documents.
   */
  deleteData: (
    predicate: { where: WherePredicate<T> },
    session?: ClientSession
  ) => Promise<number>

  /**
   * Finds the first record that matches the given query.
   * @param predicate - The filter specifying which records to find.
   * @returns A promise that resolves to the matching record.
   */
  findSingleData: (query: Query<T>) => Promise<T>

  /**
   * Finds all records that match the given query.
   * @param predicate - The filter specifying which records to find.
   * @returns A promise that resolves to an array of matching records.
   */
  findMultipleData: (query?: Query<T>) => Promise<PaginatedResult<T>>

  /**
   * Counts the number of records matching the given predicate.
   * @param predicate - The filter specifying which records to count.
   * @returns A promise that resolves to the count of matching records.
   */
  countData: (predicate?: { where: WherePredicate<T> }) => Promise<number>

  /**
   * Executes an aggregation pipeline and returns the computed results.
   * Use this for cross-document computations like `$group`, `$sum`, `$avg`, etc.
   * @param query - The aggregation definition using intuitive `where`, `groupBy`, `compute` options.
   * @returns A promise that resolves to an array of aggregation results.
   *
   * Example:
   * ```typescript
   * const results = await collection.aggregateData({
   *   where: { status: 'active' },
   *   groupBy: '$status',
   *   compute: { total: { $sum: '$amount' }, avg: { $avg: '$amount' }, count: { $sum: 1 } },
   *   sort: { total: 'desc' }
   * })
   * ```
   */
  aggregateData: (query: AggregateQuery<T>) => Promise<Record<string, unknown>[]>
}