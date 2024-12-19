import { Collection, Document } from "mongodb"

/**
 * Validates that the specified fields in the given MongoDB collection are unique.
 *
 * If any of the specified fields do not have a unique index, this function will create one.
 *
 * @param collection - The MongoDB collection to validate.
 * @param uniqueFields - An array of field names that must be unique in the collection.
 * @returns A Promise that resolves when the validation is complete.
 */
export const validateUniqueFields = async <T>(collection: Collection<Document>, uniqueFields?: (keyof T)[]) => {
  if (uniqueFields) {
    for (const field of uniqueFields) {
      if (!(await collection.indexExists(field as string | string[]))) {
        await collection.createIndex({ [field]: 1 }, { unique: true })
      }
    }
  }
}