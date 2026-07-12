import type { ClientSession } from 'mongodb'
import { v4 } from 'uuid'

import { validateUniqueFields } from '../../validator/unique.validator'
import { WherePredicate } from '../../model'
import { writeLog } from '../../utils/logger'
import { convertUuidToId, Entity, NativeCollection } from '../shared'

/**
 * Updates every record matching the filter with the given data.
 * Returns the number of modified documents.
 */
export const updateData = async <T>(
  collection: NativeCollection,
  query: { where: WherePredicate<T>, data: Partial<Omit<T, 'uuid'>>, uniqueFields?: (keyof T)[] },
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

/**
 * Atomically inserts a record if none matches the filter, or updates the existing
 * one. On insert, the `_id` is pinned: explicit uuid > filter's _id > fresh UUID.
 * Returns `{ uuid, created }`.
 */
export const upsertData = async <T extends Entity>(
  collection: NativeCollection,
  query: { where: WherePredicate<T>, data: Partial<Omit<T, 'uuid'>> & Partial<Pick<T, 'uuid'>>, uniqueFields?: (keyof T)[] },
  session?: ClientSession
): Promise<{ uuid: string, created: boolean }> => {
  try {
    const { uuid, ...rest } = query.data as any

    if (Object.keys(rest).length === 0) {
      throw new Error('Upsert data cannot be empty')
    }

    await validateUniqueFields<T>(collection, query.uniqueFields)

    const filter: Record<string, unknown> = { ...query.where }
    convertUuidToId(filter)

    // On insert, pin the _id: explicit uuid > filter's _id > fresh UUID.
    // If the filter already pins _id, Mongo reuses it — don't set it twice.
    const update: Record<string, unknown> = { $set: rest }
    if (filter._id === undefined) {
      update.$setOnInsert = { _id: uuid ?? v4() }
    }

    const result = await collection.updateOne(
      filter,
      update,
      session ? { upsert: true, session } as any : { upsert: true }
    )

    const created = (result.upsertedCount ?? 0) > 0
    let resolvedUuid: string
    if (created && result.upsertedId != null) {
      resolvedUuid = result.upsertedId.toString()
    } else if (filter._id !== undefined) {
      resolvedUuid = String(filter._id)
    } else {
      const found = await collection.findOne(filter, { projection: { _id: 1 } })
      resolvedUuid = found ? found._id.toString() : ''
    }

    return { uuid: resolvedUuid, created }
  } catch (error: Error | any) {
    writeLog('error', 'Error upserting data with filter:', query.where, error)
    throw new Error(`Failed to upsert data: ${error.message}`)
  }
}
