import { Collection } from '../src/model/collection'

declare const users: Collection<{ uuid: string, name: string }>

// Assertion 1: insertData accepts `data` without `uuid` when T requires it
void users.insertData({ data: { name: 'x' } })
void users.insertMultipleData({ datas: [{ name: 'x' }] })

// Assertion 2: insertData still accepts `data` with an explicit `uuid`
void users.insertData({ data: { uuid: 'u-1', name: 'x' } })
void users.insertMultipleData({ datas: [{ uuid: 'u-1', name: 'x' }] })
