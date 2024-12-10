/**
 * All possible operators within the fields
 */
export type QueryOperators<T> = {
  [K in keyof T]?: T[K] | (
    T[K] extends (infer U)[] ? { // For array fields
      /**
       * Matches values that are equal to the specified value
       * Example: { status: { $eq: 'active' } }
       */
      $eq?: T[K]
      /**
       * Matches values that are not equal to the specified value
       * Example: { age: { $ne: 25 } }
       */
      $ne?: T[K]
      /**
       * Matches array elements less than the specified value
       * Example: { scores: { $lt: 50 } }
       */
      $lt?: U
      /**
       * Matches array elements less than or equal to the specified value
       * Example: { scores: { $lte: 100 } }
       */
      $lte?: U
      /**
       * Matches array elements greater than the specified value
       * Example: { scores: { $gt: 70 } }
       */
      $gt?: U
      /**
       * Matches array elements greater than or equal to the specified value
       * Example: { scores: { $gte: 85 } }
       */
      $gte?: U
      /**
       * Matches array elements that are in the specified list
       * Example: { tags: { $in: ['mongodb', 'typescript'] } }
       */
      $in?: U[]
      /**
       * Matches array elements that are not in the specified list
       * Example: { tags: { $nin: ['python', 'java'] } }
       */
      $nin?: U[]
      /**
       * Matches arrays that contain all the specified elements
       * Example: { tags: { $all: ['nodejs', 'express'] } }
       */
      $all?: U[]
      /**
       * Matches arrays if at least one element matches the specified condition
       * Example: { members: { $elemMatch: { role: 'admin' } } }
       */
      $elemMatch?: Record<string, unknown>
      /**
       * Matches documents that contain (or do not contain) the field
       * Example: { age: { $exists: true } }
       */
      $exists?: boolean
    } : { // For non-array fields
      /**
       * Matches values that are equal to the specified value
       * Example: { status: { $eq: 'active' } }
       */
      $eq?: T[K]
      /**
       * Matches values that are not equal to the specified value
       * Example: { age: { $ne: 25 } }
       */
      $ne?: T[K]
      /**
       * Matches values less than the specified value
       * Example: { price: { $lt: 100 } }
       */
      $lt?: T[K]
      /**
       * Matches values less than or equal to the specified value
       * Example: { price: { $lte: 150 } }
       */
      $lte?: T[K]
      /**
       * Matches values greater than the specified value
       * Example: { price: { $gt: 200 } }
       */
      $gt?: T[K]
      /**
       * Matches values greater than or equal to the specified value
       * Example: { price: { $gte: 300 } }
       */
      $gte?: T[K]
      /**
       * Matches values that are in the specified list
       * Example: { category: { $in: ['electronics', 'books'] } }
       */
      $in?: T[K][]
      /**
       * Matches values that are not in the specified list
       * Example: { category: { $nin: ['clothing', 'toys'] } }
       */
      $nin?: T[K][]
      /**
       * Matches documents that contain (or do not contain) the field
       * Example: { stock: { $exists: true } }
       */
      $exists?: boolean
      /**
       * Matches string values that match the specified regular expression
       * Example: { name: { $regex: /example/i } }
       */
      $regex?: RegExp | string
    }
  )
}