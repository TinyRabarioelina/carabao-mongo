import { MongoClient, Db, ObjectId } from 'mongodb'
import { v4 } from 'uuid'

import { createMatch, createProjection, createLookup } from '../factory'
import { Collection, Query, WherePredicate } from '../model'
import { PaginatedResult } from '../model/paginated.result'

let db: Db
let client: MongoClient

/**
 * Connect to a remote or local MongoDB database
 * @param databaseUrl the URL of the database
 */
export const connectDatabase = async (databaseUrl: string) => {
  if (!db) {
    client = new MongoClient(databaseUrl)
    await client.connect()
    db = client.db()
  }
}

/**
 * Open the specified Database
 * @returns the database
 */
const getDatabase = async () => db

/**
 * Close the current connection to the database
 */
export const closeDatabase = async () => client && await client.close()

/**
 * Utility to convert `uuid` to `_id`
 * @param filter The filter object to modify
 */
const convertUuidToId = (filter: Record<string, unknown>) => {
  if (filter.uuid) {
    filter['_id'] = new ObjectId(filter.uuid as string)
    delete filter.uuid
  }
}

/**
 * Get an object allowing queries inside the given collection name
 * @param collectionName the name of the collection to query
 * @returns an object allowing queries inside the given collection name
 */
export const getCollection = async <T extends { uuid?: string | ObjectId }>(collectionName: string): Promise<Collection<T>> => {
  const db = await getDatabase()
  const collection = db.collection(collectionName)

  const findData = async (query?: Query<T>, single?: boolean): Promise<PaginatedResult<T>> => {
    const transformData = <T>(data: any): T => ({
      ...data,
      uuid: data._id.toString(),
      _id: undefined
    }) as T
  
    if (!query) {
      const totalCount = await collection.countDocuments()
      if (single) {
        const data = await collection.findOne()
        return {
          datas: data ? [transformData(data)] : [],
          totalCount
        }
      }
  
      const dataList = await collection.find().toArray()
      return {
        datas: dataList.map(transformData) as T[],
        totalCount
      }
    }
  
    const { where, select, join, joinConditions, limit, skip, sort, aliases } = query
  
    const matchStage = createMatch(where)
    const projectionStage = createProjection(select)
    const lookupStages = createLookup(join, joinConditions)
  
    const pipeline: Record<string, unknown>[] = []
    if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage })
    pipeline.push(...lookupStages)
    if (aliases) {
      pipeline.push({
        $addFields: Object.fromEntries(
          Object.entries(aliases).map(([alias, original]) => [alias, `$${original}`])
        )
      })
    }
    if (Object.keys(projectionStage).length > 0) pipeline.push({ $project: projectionStage })
    if (sort) {
      pipeline.push({
        $sort: Object.fromEntries(
          Object.entries(sort).map(([key, order]) => [key, order === 'asc' ? 1 : -1])
        )
      })
    }

    const totalCountPipeline = [...pipeline, { $count: 'totalCount' }]
    const totalCountResult = await collection.aggregate(totalCountPipeline).toArray()
    const totalCount = totalCountResult[0]?.totalCount || 0
  
    if (!single) {
      if (typeof skip === 'number' && skip > 0) pipeline.push({ $skip: skip })
      if (typeof limit === 'number' && limit > 0) pipeline.push({ $limit: limit })
    }
  
    const result = await collection.aggregate(pipeline).toArray()
  
    return {
      datas: result.map(transformData) as T[],
      totalCount
    }
  }

  return {
    deleteData: async (query: WherePredicate<T>): Promise<number> => {
      try {
        const filter: Record<string, unknown> = { ...query }
        convertUuidToId(filter)

        const deleteResult = await collection.deleteMany(filter)
        return deleteResult.deletedCount || 0
      } catch (error: Error | any) {
        console.error('Error deleting data with filter:', query, error)
        throw new Error(`Failed to delete data: ${error.message}`)
      }
    },

    findSingleData: async (query?: Query<T>) => ((await findData(query, true)).datas.shift()) as T,

    findMultipleData: async (query?: Query<T>) => await findData(query),

    insertData: async (data: T, uniqueFields?: (keyof T)[]) => {
      const { uuid, ...actualData } = data as any

      if (uniqueFields) {
        for (const field of uniqueFields) {
          if (!(await collection.indexExists(field as string | string[]))) {
            await collection.createIndex({ [field]: 1 }, { unique: true })
          }
        }
      }

      const { insertedId } = await collection.insertOne({ _id: v4(), ...actualData })
      return insertedId.toString()
    },

    insertMultipleData: async (datas: T[]): Promise<string[]> => {
      const finalDatas = datas.map(({ uuid, ...actualData }: any) => ({
        _id: v4(),
        ...actualData
      }))
    
      const { insertedIds } = await collection.insertMany(finalDatas)
    
      return Object.keys(insertedIds).map(index => insertedIds[parseInt(index)].toString())
    },

    updateData: async (query: WherePredicate<T>, data: Partial<T>): Promise<number> => {
      try {
        if (Object.keys(data).length === 0) {
          throw new Error('Update data cannot be empty')
        }

        const filter: Record<string, unknown> = { ...query }
        convertUuidToId(filter)

        const updateResult = await collection.updateMany(
          filter,
          { $set: data }
        )
        return updateResult.modifiedCount
      } catch (error: Error | any) {
        console.error('Error updating data with filter:', query, error)
        throw new Error(`Failed to update data: ${error.message}`)
      }
    }
  }
}