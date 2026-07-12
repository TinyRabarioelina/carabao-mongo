import type { ClientSession } from 'mongodb'
import { v4 } from 'uuid'

import { validateUniqueFields } from '../../validator/unique.validator'
import { writeLog } from '../../utils/logger'
import { Entity, NativeCollection } from '../shared'

/**
 * Inserts a single record. The `uuid` from data is preserved if provided,
 * otherwise a fresh UUID v4 is generated. Returns the resulting uuid.
 */
export const insertData = async <T extends Entity>(
  collection: NativeCollection,
  info: { data: Omit<T, 'uuid'> & Partial<Pick<T, 'uuid'>>, uniqueFields?: (keyof T)[] },
  session?: ClientSession
): Promise<string> => {
  const { uuid, ...actualData } = info.data as any

  await validateUniqueFields<T>(collection, info.uniqueFields)

  const insertedId = uuid ?? v4()
  await collection.insertOne(
    { _id: insertedId, ...actualData },
    session ? { session } as any : undefined
  )

  return insertedId
}

/**
 * Inserts multiple records (unordered). Each uuid is preserved or generated.
 * Returns the list of resulting ids, best-effort on partial failure.
 */
export const insertMultipleData = async <T extends Entity>(
  collection: NativeCollection,
  info: { datas: (Omit<T, 'uuid'> & Partial<Pick<T, 'uuid'>>)[], uniqueFields?: (keyof T)[] },
  session?: ClientSession
): Promise<string[]> => {
  const finalDatas = info.datas.map(({ uuid, ...actualData }: any) => ({
    _id: uuid ?? v4(),
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
}

/**
 * Declares a secondary index (idempotent). Returns the created index name.
 */
export const createIndex = async (
  collection: NativeCollection,
  fields: Record<string, 1 | -1>,
  options?: { unique?: boolean, sparse?: boolean, name?: string }
): Promise<string> => {
  try {
    return await collection.createIndex(fields, options ?? {})
  } catch (error: Error | any) {
    writeLog('error', 'Error creating index:', fields, error)
    throw new Error(`Failed to create index: ${error.message}`)
  }
}
