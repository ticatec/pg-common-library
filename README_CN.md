# @ticatec/pg-common-library

[![Version](https://img.shields.io/npm/v/@ticatec/pg-common-library)](https://www.npmjs.com/package/@ticatec/pg-common-library)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

这是一个专为 Node.js 应用程序设计的 PostgreSQL 数据库连接和连接池实现，基于 `pg` 驱动构建，与 [`@ticatec/node-common-library`](https://www.npmjs.com/package/@ticatec/node-common-library) 数据库接口无缝集成。

[English](./README.md) ｜ 中文

## 功能特性

- **事务支持**: 完整的事务控制，支持 `BEGIN`、`COMMIT` 和 `ROLLBACK` 操作
- **CRUD 操作**: 全面支持 SQL 查询、插入、更新和删除操作
- **接口兼容**: 实现标准的 `DBConnection` 和 `DBFactory` 接口，实现系统解耦
- **字段映射**: 自动将字段元数据映射为带类型信息的 `Field` 对象
- **连接池**: 使用 `pg.Pool` 内置连接池管理（必须使用连接池 - 不支持直接客户端连接）
- **TypeScript 支持**: 完整的 TypeScript 定义和类型安全
- **错误处理**: 强大的错误处理机制，失败时自动回滚

## 安装

```bash
npm install @ticatec/pg-common-library
```

### 依赖包

该库需要以下对等依赖：

```bash
npm install pg @ticatec/node-common-library log4js
```

## 快速开始

### 基本用法

```typescript
import { initializePg } from '@ticatec/pg-common-library';

// 初始化数据库工厂
const dbFactory = initializePg({
  user: 'postgres',
  host: 'localhost',
  database: 'myapp',
  password: 'secret',
  port: 5432,
  max: 20, // 连接池中客户端最大数量
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 创建并使用连接
const conn = await dbFactory.createDBConnection();

try {
  await conn.beginTransaction();
  
  // 查询数据
  const users = await conn.fetchData('SELECT * FROM users WHERE active = $1', [true]);
  console.log('活跃用户:', users.rows);
  
  // 插入新记录
  const newUser = await conn.insertRecord(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    ['张三', 'zhangsan@example.com']
  );
  
  // 更新记录
  const updatedUser = await conn.updateRecord(
    'UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING *',
    [newUser.id]
  );
  
  await conn.commit();
  console.log('更新的用户:', updatedUser);
} catch (error) {
  await conn.rollback();
  console.error('事务失败:', error);
} finally {
  await conn.close();
}
```

### 高级用法

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
      
      // 插入用户
      const user = await conn.insertRecord(
        'INSERT INTO users (name, email, created_at) VALUES ($1, $2, NOW()) RETURNING *',
        [userData.name, userData.email]
      );
      
      // 创建用户配置文件
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

## API 参考

### `initializePg(config: any): DBFactory`

创建一个具有连接池的 PostgreSQL 数据库工厂。

**参数:**
- `config` - PostgreSQL 连接配置 (pg.PoolConfig)

**返回:** `DBFactory` 实例

### `PgDBFactory`

实现 `DBFactory` 接口，用于创建数据库连接。

#### 方法

- `createDBConnection(): Promise<DBConnection>` - 从连接池创建新的数据库连接

### `PgDBConnection`

继承自 `DBConnection`，提供 PostgreSQL 特定的数据库操作。

#### 事务方法

- `beginTransaction(): Promise<void>` - 开始数据库事务
- `commit(): Promise<void>` - 提交当前事务  
- `rollback(): Promise<void>` - 回滚当前事务
- `close(): Promise<void>` - 释放数据库连接回连接池

#### 查询方法

- `fetchData(sql: string, params?: any[]): Promise<any>` - 执行 SELECT 查询
- `executeUpdate(sql: string, params: any[]): Promise<number>` - 执行 UPDATE/DELETE 查询
- `insertRecord(sql: string, params: any[]): Promise<any>` - 插入记录并返回结果
- `updateRecord(sql: string, params: any[]): Promise<any>` - 更新记录并返回第一条更新的行
- `deleteRecord(sql: string, params: any[]): Promise<number>` - 删除记录

#### 工具方法

- `getFields(result: any): Array<Field>` - 从查询结果中提取字段定义
- `getAffectRows(result: any): number` - 获取受影响的行数
- `getRowSet(result: any): Array<any>` - 从查询结果中提取行数据

## 配置

**重要提示**: 此库专门使用连接池。所有连接都通过 `pg.Pool` 管理，不支持直接的 `pg.Client` 连接。

配置对象接受所有标准的 `pg.Pool` 选项：

```typescript
const config = {
  // 连接设置
  user: 'postgres',
  password: 'secret',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  
  // 连接池设置
  max: 20,                      // 连接池中客户端最大数量
  min: 4,                       // 连接池中客户端最小数量
  idleTimeoutMillis: 30000,     // 30秒后关闭空闲客户端
  connectionTimeoutMillis: 2000, // 2秒内无法建立连接则返回错误
  maxUses: 7500,                // 连接使用7500次后关闭（并替换）
  
  // SSL 设置（可选）
  ssl: {
    rejectUnauthorized: false
  }
};
```

## 错误处理

该库提供强大的错误处理：

```typescript
try {
  const conn = await dbFactory.createDBConnection();
  await conn.beginTransaction();
  
  // 您的数据库操作
  
  await conn.commit();
} catch (error) {
  // 错误时事务自动回滚
  console.error('数据库错误:', error.message);
  
  if (error.code === '23505') {
    console.log('唯一约束违反');
  }
} finally {
  if (conn) {
    await conn.close();
  }
}
```

## 类型支持

该库完全支持 TypeScript 并与 `@ticatec/node-common-library` 类型集成：

- `Field` 和 `FieldType` 从 `@ticatec/node-common-library` 导入
- 所有字段类型目前默认为 `FieldType.Text`
- 可以通过扩展 `getFieldType` 方法实现自定义类型映射

## 最佳实践

1. **始终使用事务** 进行修改多个表的操作
2. **在 finally 块中关闭连接** 将连接释放回连接池并防止泄漏
3. **使用参数化查询** 防止 SQL 注入
4. **正确处理错误** 并实现适当的回滚逻辑
5. **根据应用程序并发需求配置连接池**

## 常见使用模式

### 数据访问对象 (DAO) 模式

```typescript
class UserDAO {
  private dbFactory: DBFactory;

  constructor(dbFactory: DBFactory) {
    this.dbFactory = dbFactory;
  }

  async findAll(): Promise<any[]> {
    const conn = await this.dbFactory.createDBConnection();
    try {
      const result = await conn.fetchData('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows;
    } finally {
      await conn.close();
    }
  }

  async findById(id: number): Promise<any> {
    const conn = await this.dbFactory.createDBConnection();
    try {
      const result = await conn.fetchData('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      await conn.close();
    }
  }

  async create(user: { name: string; email: string }): Promise<any> {
    const conn = await this.dbFactory.createDBConnection();
    try {
      return await conn.insertRecord(
        'INSERT INTO users (name, email, created_at) VALUES ($1, $2, NOW()) RETURNING *',
        [user.name, user.email]
      );
    } finally {
      await conn.close();
    }
  }

  async update(id: number, user: { name?: string; email?: string }): Promise<number> {
    const conn = await this.dbFactory.createDBConnection();
    try {
      const setParts = [];
      const values = [];
      let paramIndex = 1;

      if (user.name !== undefined) {
        setParts.push(`name = $${paramIndex++}`);
        values.push(user.name);
      }
      if (user.email !== undefined) {
        setParts.push(`email = $${paramIndex++}`);
        values.push(user.email);
      }

      if (setParts.length === 0) return 0;

      values.push(id);
      const sql = `UPDATE users SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`;
      
      return await conn.updateRecord(sql, values);
    } finally {
      await conn.close();
    }
  }

  async delete(id: number): Promise<number> {
    const conn = await this.dbFactory.createDBConnection();
    try {
      return await conn.deleteRecord('DELETE FROM users WHERE id = $1', [id]);
    } finally {
      await conn.close();
    }
  }
}
```

### 事务管理器

```typescript
class TransactionManager {
  private dbFactory: DBFactory;

  constructor(dbFactory: DBFactory) {
    this.dbFactory = dbFactory;
  }

  async executeInTransaction<T>(
    operation: (conn: DBConnection) => Promise<T>
  ): Promise<T> {
    const conn = await this.dbFactory.createDBConnection();
    
    try {
      await conn.beginTransaction();
      const result = await operation(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      await conn.close();
    }
  }
}

// 使用示例
const txManager = new TransactionManager(dbFactory);

const result = await txManager.executeInTransaction(async (conn) => {
  // 插入用户
  const user = await conn.insertRecord(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    ['测试用户', 'test@example.com']
  );

  // 插入用户配置文件
  await conn.insertRecord(
    'INSERT INTO user_profiles (user_id, bio) VALUES ($1, $2)',
    [user.id, '这是一个测试用户']
  );

  return user;
});
```

## 许可证

MIT License

## 作者

Henry Feng - huili.f@gmail.com

## 仓库

https://github.com/ticatec/pg-common-library

## 支持

如需报告问题或请求功能，请访问 [GitHub Issues](https://github.com/ticatec/pg-common-library/issues) 页面。