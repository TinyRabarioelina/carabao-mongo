# Carabao-Mongo

**Carabao-Mongo** is a lightweight, TypeScript-first abstraction over the official MongoDB driver.

Its goal is **not** to be an ORM, but to provide:
- strong typing
- predictable behavior
- a clean and explicit query API
- zero hidden magic

Carabao-Mongo stays very close to MongoDB concepts while removing repetitive boilerplate and enforcing consistency across your codebase.

---

## Philosophy

- **No ORM**: no models, no decorators, no schema reflection.
- **Explicit over implicit**: MongoDB always decides what happens.
- **Thin abstraction**: you can always drop down to the native driver.
- **TypeScript-first**: types help you write safer code, not hide complexity.
- **Predictable joins**: no automatic cardinality changes, no magic inference.

If you want full control over MongoDB with better DX, Carabao-Mongo is for you.

---

## Features

- **Type-safe collections** using generics
- **Explicit CRUD API** (insert, update, delete, query)
- **Aggregation-based queries** under the hood
- **Joins using `$lookup`**, without ORM-style relations
- **UUID abstraction** (`_id` is exposed as `uuid`)
- **Optimized counting** (no unnecessary joins for pagination)
- **Multi-database support** (explicit `Db` handling)
- **Transaction support**
- **No decorators, no schema reflection**
- **Stays close to the official MongoDB driver concepts**

---

## Installation

```bash
npm install carabao-mongo
```

---

## Setup

### Connect to MongoDB

```ts
import { connectDatabase, closeDatabase } from 'carabao-mongo'

const main = async () => {
  await connectDatabase('mongodb://localhost:27017/mydb')

  // your code here

  await closeDatabase()
}

main().catch(console.error)
```

`connectDatabase` returns a `Db` instance, which can be reused for multi-database or multi-tenant setups.

---

## Basic Usage

### Access a Collection

```ts
import { getCollection } from 'carabao-mongo'

interface User {
  uuid?: string
  name: string
  email: string
  createdAt: Date
  status: 'active' | 'inactive'
}

const userCollection = await getCollection<User>('users')
```

---

## Insert Data

### Insert a Single Document

```ts
const userId = await userCollection.insertData({
  data: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    createdAt: new Date(),
    status: 'active'
  },
  uniqueFields: ['email']
})

console.log('Inserted user uuid:', userId)
```

### Insert Multiple Documents

```ts
const userIds = await userCollection.insertMultipleData({
  datas: [
    { name: 'Alice', email: 'alice@example.com', createdAt: new Date(), status: 'active' },
    { name: 'Bob', email: 'bob@example.com', createdAt: new Date(), status: 'inactive' }
  ]
})

console.log('Inserted user uuids:', userIds)
```

---

## Query Data

### Find a Single Document

```ts
const user = await userCollection.findSingleData({
  where: { email: 'john.doe@example.com' }
})

console.log('User:', user)
```

### Find Multiple Documents

```ts
const activeUsers = await userCollection.findMultipleData({
  where: { status: 'active' },
  select: ['name', 'email'],
  sort: { createdAt: 'desc' },
  limit: 10
})

console.log('Active users:', activeUsers.datas)
console.log('Total count:', activeUsers.totalCount)
```

The result includes pagination metadata:

```ts
{
  datas: User[]
  totalCount: number
}
```

---

## Update Data

```ts
const updatedCount = await userCollection.updateData({
  where: { status: 'inactive' },
  data: { status: 'active' }
})

console.log('Updated documents:', updatedCount)
```

---

## Delete Data

```ts
const deletedCount = await userCollection.deleteData({
  where: { status: 'inactive' }
})

console.log('Deleted documents:', deletedCount)
```

---

## Joins

Carabao-Mongo supports joins using MongoDB `$lookup`, without introducing ORM-style relations.

### Example

```ts
interface Project {
  uuid?: string
  name: string
  createdBy: string   // user uuid
  members: string[]   // user uuids
}

const projectCollection = await getCollection<Project>('projects')

const projects = await projectCollection.findMultipleData({
  join: {
    createdBy: {
      collectionName: 'users',
      select: ['uuid', 'name', 'email']
    },
    members: {
      collectionName: 'users',
      select: ['uuid', 'name']
    }
  }
})

console.log(projects.datas)
```

### Important Join Rules

- Joins **never change cardinality automatically**.
- If the original field contains:
  - a single UUID → the joined field is an array with one element
  - an array of UUIDs → the joined field is an array of documents
- Joined documents expose `uuid` (no `_id` leaks).

This keeps joins **predictable and explicit**.

---

## Advanced Queries

### MongoDB Operators

You can use native MongoDB operators in `where` clauses:

```ts
const recentUsers = await userCollection.findMultipleData({
  where: {
    createdAt: { $gte: new Date('2024-01-01') },
    name: { $regex: /john/i }
  }
})
```

---

## Pagination

```ts
const users = await userCollection.findMultipleData({
  where: { status: 'active' },
  limit: 10,
  skip: 20
})
```

Counting is optimized and does **not** execute joins.

---

## Transactions

```ts
import { executeTransaction, getCollection } from 'carabao-mongo'
import type { ClientSession } from 'mongodb'

interface User {
  uuid?: string
  name: string
  email: string
  createdAt: Date
  status: 'active' | 'inactive'
}

const userCollection = await getCollection<User>('users')

await executeTransaction(async (session: ClientSession) => {
  await userCollection.insertData(
    {
      data: {
        name: 'Alice',
        email: 'a@test.com',
        createdAt: new Date(),
        status: 'active'
      }
    },
    session
  )

  await userCollection.updateData(
    {
      where: { email: 'a@test.com' },
      data: { status: 'inactive' }
    },
    session
  )
})
```

---

## Multi-Database Usage

If you work with multiple databases (multi-tenant, sharding, etc.), you can pass a `Db` instance to `getCollection`:

```ts
import { connectDatabase, getCollection } from 'carabao-mongo'

const dbA = await connectDatabase('mongodb://localhost:27017/tenantA')
const dbB = await connectDatabase('mongodb://localhost:27017/tenantB')

interface User {
  uuid?: string
  email: string
}

const usersA = await getCollection<User>('users', dbA)
const usersB = await getCollection<User>('users', dbB)

const a = await usersA.findMultipleData()
const b = await usersB.findMultipleData()
```

---

## Error Handling

All methods throw descriptive errors.

```ts
try {
  const user = await userCollection.findSingleData({
    where: { email: 'unknown@example.com' }
  })
  console.log('User:', user)
} catch (error) {
  console.error(error)
}
```

---

## Contributing

1. Clone the repository:
```bash
git clone https://github.com/TinyRabarioelina/carabao-mongo.git
```

2. Install dependencies:
```bash
npm install
```

3. Run tests:
```bash
npm test
```

---

## License

MIT © Tiny Rabarioelina  
See the LICENSE file in the repository.

---

## Feedback

Issues and feature requests are welcome:
- https://github.com/TinyRabarioelina/carabao-mongo/issues

---

## Acknowledgments

Carabao-Mongo was inspired by the **design principles** of tools like Prisma,  
but deliberately avoids ORM-style abstractions in favor of explicit MongoDB behavior.