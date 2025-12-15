export const entityToDTO = <T>(data: any): T => (
  {
    ...data,
    uuid: data._id.toString(),
    _id: undefined
  }
) as T