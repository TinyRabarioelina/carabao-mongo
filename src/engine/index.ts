import { MongoClient, Db, ObjectId } from 'mongodb'
import { v4 } from 'uuid'

import { Query } from '../model/query'
import { createMatch, createProjection, createLookup } from '../factory'

let db: Db
let client: MongoClient

/**
 * An interface representing what a collection looks like
 * it provides several methods allowing users to manipulate datas inside a given collection
 */
interface Collection<T> {
  insertData: (data: T, uniqueFields?: (keyof T)[]) => Promise<string>
  insertMultipleData: (datas: T[]) => Promise<string[]>
  updateData: (query: Query<T>, data: Partial<T>) => Promise<void>
  deleteMultipleData: (uuids: string[]) => Promise<void>
  findSingleData: (query?: Query<T>) => Promise<T>
  findMultipleData: (query?: Query<T>) => Promise<T[]>
}

/**
 * Connect to a remote or local MongoDB database
 * @param databaseUrl the URL of the database
 */
export const connectDatabase = async (databaseUrl: string) => {
  if (!db) {
    client = new MongoClient(process.env.DATABASE_URL!)
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
 * Get an object allowing queries inside the given collection name
 * @param collectionName the name of the collection to query
 * @returns an object allowing queries inside the given collection name
 */
export const getCollection = async <T extends { uuid?: string | ObjectId }>(collectionName: string): Promise<Collection<T>> => {
  const db = await getDatabase()
  const collection = db.collection(collectionName)

  /**
   * Find all datas respecting a given query
   * @param query
   * @param single an optional flag to tell if a single data should be return instead of a list of datas
   * @returns a list of the matchin datas
   */
  const findData = async (query?: Query<T>, single?: boolean): Promise<T | T[] | undefined> => {
    const transformData = <T>(data: any): T => ({
      ...data,
      uuid: data._id.toString(),
      _id: undefined
    }) as T

    if (!query) {
      if (single) {
        const data = await collection.findOne()

        return data ? transformData(data) : undefined
      }

      const dataList = await collection.find().toArray()

      return dataList.map(transformData) as T[]
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
    if (!single) {
      if (typeof skip === 'number' && skip > 0) pipeline.push({ $skip: skip })
      if (typeof limit === 'number' && limit > 0) pipeline.push({ $limit: limit })
    }

    const result = (await collection.aggregate(pipeline).toArray()).map(transformData)

    return single ? result.shift() as T : (result as T[])
  }

  return {
    /**
     * Delete multiple records using their ids
     * @param uuids the IDs of the datas to be deleted
     */
    deleteMultipleData: async (uuids: string[]) => {
      await collection.deleteMany({
        _id: { $in: uuids.map(uuid => new ObjectId(uuid)) }
      })
    },

    /**
     * Find the first record matching the given query
     * @param query the filter to apply
     * @returns the data matching the query
     */
    findSingleData: async (query?: Query<T>) => await findData(query, true) as T,

    /**
     * Find all records matching the given query
     * @param query the filter to apply
     * @returns a list of the matching records
     */
    findMultipleData: async (query?: Query<T>) => await findData(query) as T[],

    /**
     * Insert a single data into the collection
     * @param data the data to insert
     * @returns the unique ID of the inserted data
     */
    insertData: async (data: T, uniqueFields?: (keyof T)[]) => {
      const { uuid, ...actualData } = data as any
      if (uniqueFields) {
        for (const field in uniqueFields) {
          try {
            !await collection.indexExists(field) && await collection.createIndex({ [field]: 1 }, { unique: true })
          } catch(_) {
            console.log('No indexation needed for', field)
          }
        }
      }
      const { insertedId } = await collection.insertOne({ _id: v4(), ...actualData })

      return insertedId.toString()
    },

    /**
     * Insert multiple datas into the collection
     * @param datas the datas to insert
     * @returns the unique IDs of the inserted datas
     */
    insertMultipleData: async (datas: T[]) => {
      const finalDatas = datas.map(({ uuid, ...actualData}: any) => ({
        _id: v4(),
        ...actualData
      }))

      const { insertedIds } = await collection.insertMany(finalDatas)

      return Object.keys(insertedIds).map((index: any) => insertedIds[index].toString())
    },

    /**
     * Update a given record
     * @param query the filter to apply to the query
     * @param data the new data to be saved
     */
    updateData: async (query: Query<T>, data: Partial<T>) => {
      const { uuid, ...realData } = data

      if (query.where) {
        const where = query.where as any
        await collection.updateOne(
          {
            ...query.where,
            _id: where.uuid ? new ObjectId(where.uuid) : undefined
          },
          realData
        )
      }
    }
  }
}
