import type { Collection as MongoCollection, Document, ObjectId } from 'mongodb'

/**
 * The native MongoDB collection handle, passed to each operation function.
 * Kept as a shared alias so the create/read/update/delete modules stay decoupled
 * from the driver import details.
 */
export type NativeCollection = MongoCollection<Document>

/**
 * Minimal shape every entity satisfies: an optional identity field.
 * Used as the generic bound for operations that reference `uuid` (insert/upsert).
 */
export type Entity = { uuid?: string | ObjectId }

/**
 * Utility to convert a `uuid` filter field into the underlying `_id`.
 * Mutates the given filter object in place.
 * @param filter The filter object to modify
 */
export const convertUuidToId = (filter: Record<string, unknown>) => {
  if (filter.uuid) {
    filter['_id'] = filter.uuid
    delete filter.uuid
  }
}
