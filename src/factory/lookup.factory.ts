import { JoinOptions, StringAndStringArrayFields } from "../model/query";

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

      // Build the `$project` stage for the lookup pipeline
      const projectStage: Record<string, string | undefined> = joinSelect?.length
        ? joinSelect.reduce((acc, key) => {
            if (key === 'uuid') {
              acc['uuid'] = '$_id'
            } else {
              acc[key] = `$${key}`
            }
            
            return acc
          }, {} as Record<string, string>)
        : { uuid: '$_id' }

      projectStage['_id'] = undefined

      const pipeline: any[] = []

      // Add custom match conditions if provided
      if (joinConditions?.[field]) {
        pipeline.push({ $match: joinConditions[field] })
      }

      // Add the `$project` stage to limit fields
      pipeline.push({ $project: projectStage })

      // Add the `$lookup` stage
      lookupStages.push({
        $lookup: {
          from: collectionName,
          localField: field,
          foreignField: '_id',
          as: field,
          pipeline // Include the pipeline with `$project`
        }
      })
    }
  }

  return lookupStages
}