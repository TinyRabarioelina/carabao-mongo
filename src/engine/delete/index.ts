import type { ClientSession } from 'mongodb'

import { WherePredicate } from '../../model'
import { writeLog } from '../../utils/logger'
import { convertUuidToId, NativeCollection } from '../shared'

/**
 * Deletes every record matching the filter. Returns the number of deleted documents.
 */
export const deleteData = async <T>(
  collection: NativeCollection,
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
}
