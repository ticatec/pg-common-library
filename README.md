# @ticatec/pg-common-library

[![Version](https://img.shields.io/npm/v/@ticatec/pg-common-library)](https://www.npmjs.com/package/@ticatec/pg-common-library)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A PostgreSQL database connection and connection pool implementation for Node.js applications, built on the `pg` driver and designed to work seamlessly with the [`@ticatec/node-common-library`](https://www.npmjs.com/package/@ticatec/node-common-library) database interfaces.

[中文](./README_CN.md) ｜ English

## Features

- **Transaction Support**: Full transaction control with `BEGIN`, `COMMIT`, and `ROLLBACK` operations
- **CRUD Operations**: Complete support for SQL queries, inserts, updates, and deletes
- **Interface Compliance**: Implements standard `DBConnection` and `DBFactory` interfaces for system decoupling
- **Field Mapping**: Automatic field metadata mapping to `Field` objects with type information
- **Connection Pooling**: Built-in connection pool management using `pg.Pool` (connection pooling is required - direct client connections are not supported)
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Error Handling**: Robust error handling with automatic rollback on failures

## Installation

```bash
npm install @ticatec/pg-common-library
```

### Dependencies

The library requires these peer dependencies:

```bash
npm install pg @ticatec/node-common-library log4js
```

## Quick Start

### Basic Usage

```typescript
import { initializePg } from '@ticatec/pg-common-library';

// Initialize database factory
const dbFactory = initializePg({
  user: 'postgres',
  host: 'localhost',
  database: 'myapp',
  password: 'secret',
  port: 5432,
  max: 20, // maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create and use connection
const conn = await dbFactory.createDBConnection();

try {
  await conn.beginTransaction();
  
  // Query data
  const users = await conn.fetchData('SELECT * FROM users WHERE active = $1', [true]);
  console.log('Active users:', users.rows);
  
  // Insert new record
  const newUser = await conn.insertRecord(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    ['John Doe', 'john@example.com']
  );
  
  // Update record
  const updatedUser = await conn.updateRecord(
    'UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING *',
    [newUser.id]
  );
  
  await conn.commit();
  console.log('Updated user:', updatedUser);
} catch (error) {
  await conn.rollback();
  console.error('Transaction failed:', error);
} finally {
  await conn.close();
}
```

### Advanced Usage

```typescript
import { initializePg } from '@ticatec/pg-common-library';
import { DBConnection } from '@ticatec/node-common-library';

class UserService {
  private dbFactory;

  constructor(dbConfig: any) {
    this.dbFactory = initializePg(dbConfig);
  }

  async createUser(userData: { name: string; email: string }): Promise<any> {
    const conn: DBConnection = await this.dbFactory.createDBConnection();
    
    try {
      await conn.beginTransaction();
      
      // Insert user
      const user = await conn.insertRecord(
        'INSERT INTO users (name, email, created_at) VALUES ($1, $2, NOW()) RETURNING *',
        [userData.name, userData.email]
      );
      
      // Create user profile
      await conn.insertRecord(
        'INSERT INTO user_profiles (user_id, status) VALUES ($1, $2)',
        [user.id, 'active']
      );
      
      await conn.commit();
      return user;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      await conn.close();
    }
  }

  async getUserById(id: number): Promise<any> {
    const conn = await this.dbFactory.createDBConnection();
    
    try {
      const result = await conn.fetchData(
        'SELECT u.*, p.status FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } finally {
      await conn.close();
    }
  }
}
```

## API Reference

### `initializePg(config: any): DBFactory`

Creates a PostgreSQL database factory with connection pooling.

**Parameters:**
- `config` - PostgreSQL connection configuration (pg.PoolConfig)

**Returns:** `DBFactory` instance

### `PgDBFactory`

Implements the `DBFactory` interface for creating database connections.

#### Methods

- `createDBConnection(): Promise<DBConnection>` - Creates a new database connection from the pool

### `PgDBConnection`

Extends `DBConnection` and provides PostgreSQL-specific database operations.

#### Transaction Methods

- `beginTransaction(): Promise<void>` - Begins a database transaction
- `commit(): Promise<void>` - Commits the current transaction  
- `rollback(): Promise<void>` - Rolls back the current transaction
- `close(): Promise<void>` - Releases the database connection back to the pool

#### Query Methods

- `fetchData(sql: string, params?: any[]): Promise<any>` - Executes a SELECT query
- `executeUpdate(sql: string, params: any[]): Promise<number>` - Executes UPDATE/DELETE queries
- `insertRecord(sql: string, params: any[]): Promise<any>` - Inserts a record and returns the result
- `updateRecord(sql: string, params: any[]): Promise<any>` - Updates records and returns the first updated row
- `deleteRecord(sql: string, params: any[]): Promise<number>` - Deletes records

#### Utility Methods

- `getFields(result: any): Array<Field>` - Extracts field definitions from query results
- `getAffectRows(result: any): number` - Gets the number of affected rows
- `getRowSet(result: any): Array<any>` - Extracts row data from query results

## Configuration

**Important**: This library uses connection pooling exclusively. All connections are managed through `pg.Pool`, and direct `pg.Client` connections are not supported.

The configuration object accepts all standard `pg.Pool` options:

```typescript
const config = {
  // Connection settings
  user: 'postgres',
  password: 'secret',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  
  // Pool settings
  max: 20,                      // max number of clients in pool
  min: 4,                       // min number of clients in pool
  idleTimeoutMillis: 30000,     // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return error after 2 seconds if connection could not be established
  maxUses: 7500,                // close (and replace) a connection after it has been used 7500 times
  
  // SSL settings (optional)
  ssl: {
    rejectUnauthorized: false
  }
};
```

## Error Handling

The library provides robust error handling:

```typescript
try {
  const conn = await dbFactory.createDBConnection();
  await conn.beginTransaction();
  
  // Your database operations here
  
  await conn.commit();
} catch (error) {
  // Transaction automatically rolls back on error
  console.error('Database error:', error.message);
  
  if (error.code === '23505') {
    console.log('Unique constraint violation');
  }
} finally {
  if (conn) {
    await conn.close();
  }
}
```

## Type Support

The library fully supports TypeScript and integrates with `@ticatec/node-common-library` types:

- `Field` and `FieldType` are imported from `@ticatec/node-common-library`
- All field types currently default to `FieldType.Text`
- Custom type mapping can be implemented by extending the `getFieldType` method

## Best Practices

1. **Always use transactions** for operations that modify multiple tables
2. **Close connections** in finally blocks to release them back to the pool and prevent leaks
3. **Use parameterized queries** to prevent SQL injection
4. **Handle errors properly** and implement appropriate rollback logic
5. **Configure connection pools** based on your application's concurrency needs

## License

MIT License

## Author

Henry Feng - huili.f@gmail.com

## Repository

https://github.com/ticatec/pg-common-library

## Support

For issues and feature requests, please visit the [GitHub Issues](https://github.com/ticatec/pg-common-library/issues) page.