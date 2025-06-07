# PgDBConnection for `@ticatec/node-common-library`

## [[中文文档](./README_CN.md)]

This is a PostgreSQL database connection and connection pool implementation based on the `pg` driver, designed to work with the [`@ticatec/node-common-library`](https://www.npmjs.com/package/@ticatec/node-common-library) interfaces.

## Features

* Supports transaction control (`BEGIN` / `COMMIT` / `ROLLBACK`)
* Supports SQL query, insert, update, and delete operations
* Decoupled from the system via `DBConnection` and `DBFactory` interfaces
* Automatically maps field metadata into `Field` objects
* Provides a connection pooling mechanism based on `pg.Pool`

## Installation

```bash
npm install pg @ticatec/node-common-library
```

## Usage

### Initialize Connection Pool

```ts
import { initializePg } from './PgDBConnection';

const dbFactory = initializePg({
  user: 'postgres',
  host: 'localhost',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});
```

### Create Connection and Execute Query

```ts
const conn = await dbFactory.createDBConnection();

try {
  await conn.beginTransaction();

  const rows = await conn.fetchData('SELECT * FROM users WHERE id = $1', [1]);
  console.log(rows.rows);

  await conn.commit();
} catch (error) {
  await conn.rollback();
  console.error('Error occurred:', error);
} finally {
  await conn.close();
}
```

## API Reference

### `PgDBConnection`

Extends `DBConnection` and encapsulates PostgreSQL connection operations:

* `beginTransaction()`: Start a transaction
* `commit()`: Commit a transaction
* `rollback()`: Rollback a transaction
* `executeUpdate(sql, params)`: Execute an update SQL statement
* `fetchData(sql, params)`: Execute a query
* `insertRecord(sql, params)`: Insert a record and return the first row
* `deleteRecord(sql, params)`: Delete records
* `updateRecord(sql, params)`: Update records
* `getFields(result)`: Extract field definitions
* `getAffectRows(result)`: Get the number of affected rows

### `PgDBFactory`

Implements the `DBFactory` interface and encapsulates connection pool management:

* `createDBConnection()`: Acquire a `PgDBConnection` instance from the pool

### `initializePg(config): DBFactory`

Initializes and returns a `PgDBFactory` instance. The `config` parameter is a standard `pg.PoolConfig` object.

## Type Support

* `Field` and `FieldType` are defined in `@ticatec/node-common-library`
* All field types default to `FieldType.Text`; you may extend `getFieldType` for custom type mappings

## License

MIT License

## Contact

huili.f@gmail.com

https://github.com/ticatec/pg-common-library

