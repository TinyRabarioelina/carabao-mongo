import { MongoClient, ClientSession, ObjectId } from "mongodb"
import { PaginatedResult } from "./paginated.result"
import { Query, WherePredicate } from "./query"
import { AggregateQuery } from "./aggregate"

/**
 * Options accepted when declaring a secondary index.
 */
export interface IndexOptions {
  /** Enforce uniqueness on the indexed field(s). */
  unique?: boolean
  /** Only index documents that contain the indexed field(s). */
  sparse?: boolean
  /** Custom index name. */
  name?: string
}

/**
 * Result of an upsert operation.
 */
export interface UpsertResult {
  /** The `uuid` of the affected document. */
  uuid: string
  /** `true` when a new document was inserted, `false` when an existing one was updated. */
  created: boolean
}

/**
 * An interface representing a MongoDB collection and its common operations.
 * Provides methods for manipulating data within a specific collection.
 */
export interface Collection<T extends { uuid?: string | ObjectId }> {
  /**
   * Inserts a single record into the collection.
   * @param data - The data object to insert.
   * @param uniqueFields - Optional array of field names to enforce uniqueness.
   * @returns A promise that resolves to the unique ID of the inserted record.
   */
  insertData: (
    info: { data: Omit<T, 'uuid'> & Partial<Pick<T, 'uuid'>>, uniqueFields?: (keyof T)[]},
    session?: ClientSession
  ) => Promise<string>

 /**
  *
  * @param info
  * @param session
  * @returns
  */
  insertMultipleData: (
    datas: {datas: (Omit<T, 'uuid'> & Partial<Pick<T, 'uuid'>>)[], uniqueFields?: (keyof T)[]},
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
   * Atomically inserts a record if none matches the filter, or updates the existing one.
   * Single round-trip (`updateOne` with `upsert: true`), so it is race-safe unlike a
   * manual find-then-insert. On insert, the `uuid` from `data` is preserved if provided,
   * otherwise the filter's `uuid` is used, otherwise a fresh UUID v4 is generated.
   * @param predicate - `where` filter, the `data` to set, and optional `uniqueFields`.
   * @returns A promise resolving to `{ uuid, created }`.
   */
  upsertData: (
    predicate: { where: WherePredicate<T>, data: Partial<Omit<T, 'uuid'>> & Partial<Pick<T, 'uuid'>>, uniqueFields?: (keyof T)[] },
    session?: ClientSession
  ) => Promise<UpsertResult>

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
   * Finds the first record that matches the given query, or `null` when none matches.
   * @param query - The filter specifying which record to find.
   * @returns A promise that resolves to the matching record, or `null`.
   */
  findSingleData: (query: Query<T>) => Promise<T | null>

  /**
   * Finds the first record that matches the given query, throwing when none matches.
   * Use this when the caller treats absence as an error (e.g. resolving a foreign key).
   * @param query - The filter specifying which record to find.
   * @param errorMessage - Optional custom error message thrown when no record matches.
   * @returns A promise that resolves to the matching record (never `null`).
   */
  findSingleDataOrThrow: (query: Query<T>, errorMessage?: string) => Promise<T>

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

  /**
   * Declares a secondary index on the collection (idempotent — safe to call on every boot).
   * Wraps the native `createIndex`, so no need to drop to the raw `Db` for performance indexes.
   * @param fields - Map of field name to sort order (`1` ascending, `-1` descending).
   * @param options - Optional index options (`unique`, `sparse`, `name`).
   * @returns A promise resolving to the created index name.
   *
   * Example:
   * ```typescript
   * await collection.createIndex({ sourceSenseId: 1 })
   * await collection.createIndex({ email: 1 }, { unique: true })
   * ```
   */
  createIndex: (fields: Record<string, 1 | -1>, options?: IndexOptions) => Promise<string>
}