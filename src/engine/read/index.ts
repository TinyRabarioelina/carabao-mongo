import { createMatch, createProjection, createLookup, createCompute } from '../../factory'
import { entityToDTO } from '../../factory/mapper'
import { Query, WherePredicate, AggregateQuery } from '../../model'
import { PaginatedResult } from '../../model/paginated.result'
import { writeLog } from '../../utils/logger'
import { convertUuidToId, NativeCollection } from '../shared'

/**
 * Core read routine shared by the single/multiple finders.
 * Builds and runs the aggregation pipeline (match → lookup → aliases → compute →
 * project → sort → skip/limit) and returns a paginated result.
 */
export const findData = async <T>(
  collection: NativeCollection,
  query?: Query<T>,
  single?: boolean
): Promise<PaginatedResult<T>> => {
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

  const { where, select, join, joinConditions, limit, skip, sort, aliases, compute } = query

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

  const computeStage = createCompute(compute)
  computeStage && pipeline.push(computeStage)

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

/**
 * Finds the first matching record, or `null` when none matches.
 */
export const findSingleData = async <T>(collection: NativeCollection, query: Query<T>): Promise<T | null> =>
  ((await findData<T>(collection, query, true)).datas.shift() ?? null) as T | null

/**
 * Finds the first matching record, throwing when none matches.
 */
export const findSingleDataOrThrow = async <T>(
  collection: NativeCollection,
  query: Query<T>,
  errorMessage?: string
): Promise<T> => {
  const result = (await findData<T>(collection, query, true)).datas.shift()
  if (result === undefined) {
    throw new Error(errorMessage ?? `No document found in "${collection.collectionName}" for the given query`)
  }
  return result as T
}

/**
 * Finds all records matching the query, paginated.
 */
export const findMultipleData = async <T>(collection: NativeCollection, query?: Query<T>): Promise<PaginatedResult<T>> =>
  await findData<T>(collection, query)

/**
 * Counts the records matching the predicate.
 */
export const countData = async <T>(
  collection: NativeCollection,
  predicate?: { where: WherePredicate<T> }
): Promise<number> => {
  try {
    if (!predicate?.where) {
      return await collection.countDocuments()
    }

    const filter: Record<string, unknown> = { ...predicate.where }
    convertUuidToId(filter)

    const matchStage = createMatch(filter)

    return await collection.countDocuments(matchStage)
  } catch (error: Error | any) {
    writeLog('error', 'Error counting data with filter:', predicate?.where, error)
    throw new Error(`Failed to count data: ${error.message}`)
  }
}

/**
 * Runs an aggregation pipeline (match → group → sort → limit).
 */
export const aggregateData = async <T>(
  collection: NativeCollection,
  query: AggregateQuery<T>
): Promise<Record<string, unknown>[]> => {
  try {
    const { where, groupBy, compute, sort, limit } = query

    const pipeline: Record<string, unknown>[] = []

    // $match
    where && convertUuidToId(where as Record<string, unknown>)
    const matchStage = createMatch(where)
    Object.keys(matchStage).length && pipeline.push({ $match: matchStage })

    // $group
    const groupStage: Record<string, unknown> = { _id: groupBy ?? null }
    if (compute) {
      Object.entries(compute).forEach(([key, expr]) => {
        groupStage[key] = expr
      })
    }
    pipeline.push({ $group: groupStage })

    // $sort
    sort && pipeline.push({
      $sort: Object.fromEntries(
        Object.entries(sort).map(([key, order]) => [key, order === 'asc' ? 1 : -1])
      )
    })

    // $limit
    typeof limit === 'number' && limit > 0 && pipeline.push({ $limit: limit })

    return await collection.aggregate(pipeline).toArray()
  } catch (error: Error | any) {
    writeLog('error', 'Error executing aggregation:', query, error)
    throw new Error(`Failed to execute aggregation: ${error.message}`)
  }
}
