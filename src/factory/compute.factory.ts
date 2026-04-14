/**
 * Create an $addFields stage for computed expressions.
 * @param compute a map of output field names to MongoDB aggregation expressions
 * @returns a Record representing the $addFields stage, or null if compute is empty
 */
export const createCompute = (
  compute?: Record<string, Record<string, unknown>>
): Record<string, unknown> | null => {
  if (!compute || Object.keys(compute).length === 0) {
    return null
  }

  return {
    $addFields: compute
  }
}
