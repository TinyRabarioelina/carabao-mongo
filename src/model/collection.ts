import { MongoClient } from "mongodb"
import { PaginatedResult } from "./paginated.result"
import { Query, WherePredicate } from "./query"

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
  insertData: (data: T, uniqueFields?: (keyof T)[], session?: MongoClient['startSession']) => Promise<string>

  /**
   * Inserts multiple records into the collection.
   * @param datas - An array of data objects to insert.
   * @returns A promise that resolves to an array of unique IDs of the inserted records.
   */
  insertMultipleData: (datas: T[], session?: MongoClient['startSession']) => Promise<string[]>

  /**
   * Updates records matching the given query.
   * @param query - The query specifying which records to update.
   * @param data - The updated data to apply.
   * @returns A promise that resolves to the number of datas updated when the update is complete.
   */
  updateData: (query: WherePredicate<T>, data: Partial<T>, session?: MongoClient['startSession']) => Promise<number>

  /**
   * Deletes all records matching the given query.
   * @param query - The filter query specifying which records to delete.
   * @returns A promise that resolves to the number of deleted documents.
   */
  deleteData: (query: WherePredicate<T>, session?: MongoClient['startSession']) => Promise<number>

  /**
   * Finds the first record that matches the given query.
   * @param query - The query specifying the record to find.
   * @returns A promise that resolves to the matching record.
   */
  findSingleData: (query?: Query<T>) => Promise<T>

  /**
   * Finds all records that match the given query.
   * @param query - The query specifying the records to find.
   * @returns A promise that resolves to an array of matching records.
   */
  findMultipleData: (query?: Query<T>) => Promise<PaginatedResult<T>>

  /**
   * Executes a series of operations within a transaction.
   * @param operations - A callback function containing the operations to execute.
   * @returns The result of the transaction, if successful.
   * @throws An error if the transaction fails.
   */
  executeTransaction: <T>(operations: (session: MongoClient['startSession']) => Promise<T>) => Promise<T>
}