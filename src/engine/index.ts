import { MongoClient, Db, ObjectId } from 'mongodb'

import { Collection } from '../model'
import { writeLog } from '../utils/logger'
import * as read from './read'
import * as create from './create'
import * as update from './update'
import * as del from './delete'

let db: Db
let client: MongoClient

/**
 * Connect to a remote or local MongoDB database
 * @param databaseUrl the URL of the database
 */
export const connectDatabase = async (databaseUrl: string) => {
  client = new MongoClient(databaseUrl)
  await client.connect()
  db = client.db()

  return db
}

/**
 * Return the original MongoDB database in order to permit raw queries.
 * This ensures that users still have the choice to use MongoDB directly.
 * @returns the database
 */
const getRawDatabase = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase first.')
  }
  return db
}

/**
 * Close the current connection to the database
 */
export const closeDatabase = async () => client && await client.close()

/**
 * Executes a series of operations within a transaction.
 * @param operations - A callback function containing the operations to execute.
 * @returns The result of the transaction, if successful.
 * @throws An error if the transaction fails.
 */
export const executeTransaction = async <T>(operations: (session: any) => Promise<T>): Promise<T> => {
  const session = client.startSession()

  try {
    let result: T
    await session.withTransaction(async () => {
      result = await operations(session)
    })

    return result!
  } catch (error: Error | any) {
    writeLog('error', 'Transaction failed:', error)
    throw new Error(`Transaction failed: ${error.message}`)
  } finally {
    session.endSession()
  }
}

/**
 * Get an object allowing queries inside the given collection.
 * Each operation is implemented in its own module (create / read / update / delete)
 * and receives the native collection handle; this factory only wires them together.
 * @type T
 * @param collectionName the name of the collection to query
 * @param database optional database handle for multi-database setups
 * @returns an object exposing the typed CRUD API for the collection
 */
export const getCollection = async <T extends { uuid?: string | ObjectId }>(
  collectionName: string,
  database?: Db
): Promise<Collection<T>> => {
  const activeDb = database ?? getRawDatabase()
  const collection = activeDb.collection(collectionName)

  return {
    // create
    insertData: (info, session) => create.insertData<T>(collection, info, session),
    insertMultipleData: (info, session) => create.insertMultipleData<T>(collection, info, session),
    createIndex: (fields, options) => create.createIndex(collection, fields, options),

    // read
    findSingleData: (query) => read.findSingleData<T>(collection, query),
    findSingleDataOrThrow: (query, errorMessage) => read.findSingleDataOrThrow<T>(collection, query, errorMessage),
    findMultipleData: (query) => read.findMultipleData<T>(collection, query),
    countData: (predicate) => read.countData<T>(collection, predicate),
    aggregateData: (query) => read.aggregateData<T>(collection, query),

    // update
    updateData: (query, session) => update.updateData<T>(collection, query, session),
    upsertData: (query, session) => update.upsertData<T>(collection, query, session),

    // delete
    deleteData: (query, session) => del.deleteData<T>(collection, query, session)
  }
}
