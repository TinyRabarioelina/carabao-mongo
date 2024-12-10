/**
 * Create a projection in order to return only the given fields from the database
 * @param select a list of the fields to select
 * @returns a Record object listing all the fields to return
 */
export const createProjection = <T>(select?: (keyof T)[]) => {
  const projectionStage: Record<string, number> = {}

  if (select) {
    select.forEach(field => {
      projectionStage[field as string] = 1;
    })
  }

  return projectionStage
}