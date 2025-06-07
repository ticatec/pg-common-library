# PgDBConnection for `@ticatec/node-common-library`

这是一个基于 `pg` 驱动并适配 [`@ticatec/node-common-library`](https://www.npmjs.com/package/@ticatec/node-common-library) 接口的 PostgreSQL 数据库连接和连接池实现。

## 功能特性

* 支持事务控制（`BEGIN` / `COMMIT` / `ROLLBACK`）
* 支持 SQL 查询、插入、更新、删除操作
* 通过 `DBConnection` 和 `DBFactory` 接口与系统解耦
* 自动映射字段信息为 `Field` 对象
* 提供连接池机制（基于 `pg.Pool`）

## 安装依赖

```bash
npm install pg @ticatec/node-common-library
```

## 使用方法

### 初始化连接池

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

### 创建连接并执行查询

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

## 接口说明

### `PgDBConnection`

继承自 `DBConnection`，封装了 PostgreSQL 的连接操作：

* `beginTransaction()`: 开始事务
* `commit()`: 提交事务
* `rollback()`: 回滚事务
* `executeUpdate(sql, params)`: 执行更新语句
* `fetchData(sql, params)`: 执行查询语句
* `insertRecord(sql, params)`: 插入并返回首行记录
* `deleteRecord(sql, params)`: 删除记录
* `updateRecord(sql, params)`: 更新记录
* `getFields(result)`: 提取字段定义
* `getAffectRows(result)`: 获取影响的行数

### `PgDBFactory`

实现 `DBFactory` 接口，封装了连接池的创建与连接管理：

* `createDBConnection()`: 从连接池获取一个 `PgDBConnection` 实例

### `initializePg(config): DBFactory`

初始化并返回一个 `PgDBFactory` 实例。`config` 参数为标准 `pg.PoolConfig` 对象。

## 类型支持

* `Field` 和 `FieldType` 类型定义来自 `@ticatec/node-common-library`
* 默认将所有字段类型设为 `FieldType.Text`，如需精细控制可扩展 `getFieldType`

## 许可

MIT License

