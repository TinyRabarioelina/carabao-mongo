
# **Carabao-Mongo**

Carabao-Mongo is a powerful TypeScript library that simplifies MongoDB operations. It provides flexible and type-safe methods for querying, inserting, updating, and deleting data, all while leveraging MongoDB's advanced capabilities like aggregation pipelines.

---

## **Features**

- **Type Safety**: Strong TypeScript support ensures safer and more predictable code.
- **Flexible Querying**: Supports advanced filtering, joins, and projections with intuitive APIs.
- **Utility Functions**: Simplified methods for common MongoDB operations.
- **UUID Integration**: Automatically manages UUIDs for documents.
- **Modular Design**: Designed for scalability and reusability.

---

## **Installation**

Install the library via NPM:

```bash
npm install carabao-mongo
```

---

## **Setup**

### Connect to the Database

```typescript
import { connectDatabase, closeDatabase } from 'carabao-mongo'

const main = async () => {
  await connectDatabase('mongodb://localhost:27017/mydb')

  // Perform operations...

  await closeDatabase()
}

main().catch(console.error)
```

---

## **Usage**

### Access a Collection

```typescript
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

### Insert Data

#### Insert a Single Document

```typescript
const userId = await userCollection.insertData({
  name: 'John Doe',
  email: 'john.doe@example.com',
  createdAt: new Date(),
  status: 'active'
})
console.log('Inserted User ID:', userId)
```

#### Insert Multiple Documents

```typescript
const userIds = await userCollection.insertMultipleData([
  { name: 'Alice', email: 'alice@example.com', createdAt: new Date(), status: 'active' },
  { name: 'Bob', email: 'bob@example.com', createdAt: new Date(), status: 'inactive' }
])
console.log('Inserted User IDs:', userIds)
```

---

### Query Data

#### Find a Single Document

```typescript
const user = await userCollection.findSingleData({
  where: { email: 'john.doe@example.com' }
})
console.log('User:', user)
```

#### Find Multiple Documents

```typescript
const activeUsers = await userCollection.findMultipleData({
  where: { status: 'active' },
  select: ['name', 'email'],
  sort: { createdAt: 'desc' },
  limit: 10
})
console.log('Active Users:', activeUsers)
```

---

### Update Data

```typescript
const updatedCount = await userCollection.updateData(
  { status: 'inactive' }, // Filter
  { status: 'active' }    // Update
)
console.log('Updated Documents:', updatedCount)
```

---

### Delete Data

```typescript
const deletedCount = await userCollection.deleteData({
  status: 'inactive'
})
console.log('Deleted Documents:', deletedCount)
```

---

### Joins

#### Example: Join with Another Collection

```typescript
interface Project {
  uuid?: string
  name: string
  createdBy: string // UUID of the user who created the project
  members: string[] // UUIDs of users who are members of the project
}

const projectCollection = await getCollection<Project>('projects')

const projects = await projectCollection.findMultipleData({
  join: {
    createdBy: { collectionName: 'users', select: ['name', 'email'] },
    members: { collectionName: 'users', select: ['name', 'email'] }
  },
  where: { status: 'active' }
})

// projects will now contain the joined data instead of just UUIDs

console.log('Projects with User Info:', projects)
```

---

## **Advanced Features**

### Custom Query Conditions

Leverage MongoDB operators like `$gte`, `$regex`, and `$in` for advanced queries:

```typescript
const recentUsers = await userCollection.findMultipleData({
  where: {
    createdAt: { $gte: new Date('2024-01-01') },
    name: { $regex: /john/i }
  }
})
console.log('Recent Users:', recentUsers)
```

### Pagination

Use `limit` and `skip` for efficient pagination:

```typescript
const users = await userCollection.findMultipleData({
  where: { status: 'active' },
  limit: 10,
  skip: 20
})
console.log('Paginated Users:', users)
```

---

## **Error Handling**

All methods throw descriptive errors on failure. Use `try...catch` to handle them:

```typescript
try {
  const user = await userCollection.findSingleData({ where: { email: 'notfound@example.com' } })
  console.log('User:', user)
} catch (error) {
  console.error('Error:', error)
}
```

---

## **Contributing**

1. Clone the repository:
```bash
   git clone https://github.com/yourusername/carabao-mongo.git
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

## **License**

Carabao-Mongo is licensed under the MIT License. See the [LICENSE](https://github.com/TinyRabarioelina/carabao-mongo/blob/main/LICENSE) file for more details.

---

## **Feedback**

If you have any feedback, feature requests, or encounter issues, please open an [issue](https://github.com/TinyRabarioelina/carabao-mongo/issues).

## **Acknowledgments**

This library was inspired by the incredible work of the [Prisma team](https://www.prisma.io/). Their approach to simplifying and streamlining database interactions served as a foundation for many of the ideas implemented in Carabao-Mongo. While Carabao-Mongo focuses specifically on MongoDB, Prisma’s design principles influenced the structure and philosophy of this project.

Thank you to the Prisma team for their contribution to the developer ecosystem!
