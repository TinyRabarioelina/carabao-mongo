import { QueryOperators } from "../model/operators"

/**
 * Create a request to search for a matching record in the database
 * @param where the query to find the nested records
 * @returns a QueryOperator object to add to the pipeline
 */
export const createMatch = <T>(
  where?: QueryOperators<T> | { or?: QueryOperators<T>[] } | { and?: QueryOperators<T>[] }
): Record<string, unknown> => {
  const matchStage: Record<string, unknown> = {}

  if (where) {
    if ('or' in where) {
      matchStage.$or = where.or
    } else if ('and' in where) {
      matchStage.$and = where.and
    } else {
      Object.entries(where).forEach(([key, value]) => {
        matchStage[key] = value
      })
    }
  }

  return matchStage
}