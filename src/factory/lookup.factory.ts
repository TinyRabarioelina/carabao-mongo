import { JoinOptions, StringAndStringArrayFields } from '../model/query'

/**
 * Create a lookup object to search for nested objects
 * @param join the join to perform
 * @returns a lookup object to add to the pipeline
 */
export const createLookup = <T>(
  join?: Partial<Record<StringAndStringArrayFields<T>, JoinOptions>>,
  joinConditions?: Record<string, Record<string, unknown>>
) => {
  const lookupStages: Record<string, unknown>[] = []

  if (join) {
    for (const [field, joinConfig] of Object.entries(join)) {
      const { collectionName, select: joinSelect } = joinConfig as JoinOptions
      const isArrayFieldFlag = `__${field}_isArray`

      const projectStage: Record<string, string | number> = joinSelect?.length
        ? joinSelect.reduce((acc, key) => {
            if (key === 'uuid') {
              acc.uuid = '$_id'
            } else {
              acc[key] = `$${key}`
            }

            return acc
          }, {} as Record<string, string>)
        : { uuid: '$_id' }

      projectStage._id = 0

      const pipeline: Record<string, unknown>[] = []

      if (joinConditions?.[field]) {
        pipeline.push({ $match: joinConditions[field] })
      }

      pipeline.push({ $project: projectStage })

      lookupStages.push({
        $addFields: {
          [isArrayFieldFlag]: {
            $isArray: `$${field}`
          }
        }
      })

      lookupStages.push({
        $lookup: {
          from: collectionName,
          localField: field,
          foreignField: '_id',
          as: field,
          pipeline
        }
      })

      lookupStages.push({
        $addFields: {
          [field]: {
            $cond: {
              if: `$${isArrayFieldFlag}`,
              then: `$${field}`,
              else: {
                $arrayElemAt: [`$${field}`, 0]
              }
            }
          }
        }
      })

      lookupStages.push({
        $project: {
          [isArrayFieldFlag]: 0
        }
      })
    }
  }

  return lookupStages
}