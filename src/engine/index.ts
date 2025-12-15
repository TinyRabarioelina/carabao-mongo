import { MongoClient, Db, ObjectId, ClientSession } from 'mongodb'
import { v4 } from 'uuid'

import { createMatch, createProjection, createLookup } from '../factory'
import { Collection, Query, WherePredicate } from '../model'
import { PaginatedResult } from '../model/paginated.result'
import { validateUniqueFields } from '../validator/unique.validator'
import { entityToDTO } from '../factory/mapper'
import { writeLog } from '../utils/logger'

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
 * Utility to convert `uuid` to `_id`
 * @param filter The filter object to modify
 */
const convertUuidToId = (filter: Record<string, unknown>) => {
  if (filter.uuid) {
    filter['_id'] = filter.uuid
    delete filter.uuid
  }
}

/**
 * Get an object allowing queries inside the given collection
 * @type T
 * @param collectionName the name of the collection to query, set to T type name by default
 * @returns an object allowing queries inside the given collection name
 */
export const getCollection = async <T extends { uuid?: string | ObjectId }>(collectionName: string, database?: Db): Promise<Collection<T>> => {
  const db = database ?? getRawDatabase()
  const collection = db.collection(collectionName)

  const findData = async (query?: Query<T>, single?: boolean): Promise<PaginatedResult<T>> => {
    if (!query) {
      const totalCount = await collection.countDocuments()
      if (single) {
        const data = await collection.findOne()

        return {
          datas: data ? [entityToDTO<T>(data)] : [],
          totalCount
        }
      }
  
      const dataList = await collection.find().toArray()

      return {
        datas: dataList.map(entityToDTO<T>),
        totalCount
      }
    }
  
    const { where, select, join, joinConditions, limit, skip, sort, aliases } = query
   
    const pipeline: Record<string, unknown>[] = []

    where && convertUuidToId(where)
    const matchStage = createMatch(where)
    Object.keys(matchStage).length && pipeline.push({ $match: matchStage })

    const lookupStages = createLookup(join, joinConditions)
    pipeline.push(...lookupStages)

    aliases && pipeline.push(
      {
        $addFields: Object.fromEntries(
          Object.entries(aliases).map(([alias, original]) => [alias, `$${original}`])
        )
      }
    )

    const projectionStage = createProjection(select)
    Object.keys(projectionStage).length && pipeline.push({ $project: projectionStage })

    sort && pipeline.push(
      {
        $sort: Object.fromEntries(
          Object.entries(sort).map(([key, order]) => [key, order === 'asc' ? 1 : -1])
        )
      }
    )

    const countPipeline: Record<string, unknown>[] = []
    if (Object.keys(matchStage).length) {
      countPipeline.push({ $match: matchStage })
    }
    countPipeline.push({ $count: 'totalCount' })
    const totalCountResult = await collection
      .aggregate(countPipeline)
      .toArray()
    const totalCount = totalCountResult[0]?.totalCount || 0
  
    if (!single) {
      if (typeof skip === 'number' && skip > 0) pipeline.push({ $skip: skip })
      if (typeof limit === 'number' && limit > 0) pipeline.push({ $limit: limit })
    }
  
    const result = await collection.aggregate(pipeline).toArray()
  
    return {
      datas: result.map(entityToDTO<T>),
      totalCount
    }
  }

  return {
    deleteData: async (
      query: { where: WherePredicate<T> },
      session?: ClientSession
    ): Promise<number> => {
      try {
        const filter: Record<string, unknown> = { ...query.where }
        convertUuidToId(filter)
        const deleteResult = await collection.deleteMany(filter, session ? { session } as any : undefined)

        return deleteResult.deletedCount || 0
      } catch (error: Error | any) {
        writeLog('error', 'Error deleting data with filter:', query.where, error)
        throw new Error(`Failed to delete data: ${error.message}`)
      }
    },

    findSingleData: async (query: Query<T>) => ((await findData(query, true)).datas.shift()) as T,

    findMultipleData: async (query?: Query<T>) => await findData(query),

    insertData: async (info: { data: Omit<T, 'uuid'>, uniqueFields?: (keyof T)[]}, session?: ClientSession) => {
      const { uuid, ...actualData } = info.data as any

      await validateUniqueFields<T>(collection, info.uniqueFields)

      const insertedId = v4()
      await collection.insertOne(
        { _id: insertedId, ...actualData },
        session ? { session } as any : undefined
      )

      return insertedId
    },

    insertMultipleData: async (
      info: { datas: Omit<T, 'uuid'>[], uniqueFields?: (keyof T)[]},
      session?: ClientSession
    ): Promise<string[]> => {
      const finalDatas = info.datas.map(({ uuid, ...actualData }: any) => ({
        _id: v4(),
        ...actualData
      }))

      await validateUniqueFields<T>(collection, info.uniqueFields)
    
      try {
        const { insertedIds } = await collection.insertMany(finalDatas, session ? { session, ordered: false } as any : { ordered: false })
    
        return Object.keys(insertedIds).map(index => insertedIds[parseInt(index)].toString())
      } catch (err: any) {
        return err.result?.insertedIds
          ? Object.values(err.result.insertedIds).map((id: any) => id.toString())
          : []
      }
    },

    updateData: async (
      query: {where: WherePredicate<T>, data: Partial<Omit<T, 'uuid'>>, uniqueFields?: (keyof T)[]},
      session?: ClientSession
    ): Promise<number> => {
      try {
        if (Object.keys(query.data).length === 0) {
          throw new Error('Update data cannot be empty')
        }

        await validateUniqueFields<T>(collection, query.uniqueFields)

        const filter: Record<string, unknown> = { ...query.where }
        convertUuidToId(filter)

        const updateResult = await collection.updateMany(
          filter,
          { $set: query.data },
          session ? { session } as any : undefined
        )

        return updateResult.modifiedCount
      } catch (error: Error | any) {
        writeLog('error', 'Error updating data with filter:', query, error)
        throw new Error(`Failed to update data: ${error.message}`)
      }
    }
  }
}