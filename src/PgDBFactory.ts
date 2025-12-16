import {DBConnection, DBFactory} from "@ticatec/node-common-library";
import {Pool, PoolClient, Result} from 'pg';
import Field, {FieldType} from "@ticatec/node-common-library/lib/db/Field";

/**
 * PostgreSQL database connection implementation
 * Extends the base DBConnection class to provide PostgreSQL-specific functionality
 */
class PgDBConnection extends DBConnection {

    /**
     * PostgreSQL client instance
     * @private
     */
    #client: PoolClient;

    /**
     * Creates a new PostgreSQL database connection instance
     * @param {PoolClient} conn - PostgreSQL pool client instance
     */
    constructor(conn: PoolClient) {
        super();
        this.#client = conn;
    }

    /**
     * Begins a database transaction
     * @returns {Promise<void>} Promise that resolves when transaction begins
     */
    async beginTransaction(): Promise<void> {
        await this.#client.query('BEGIN');
        return
    }

    /**
     * Closes the database connection and releases it back to the pool
     * @returns {Promise<void>} Promise that resolves when connection is released
     */
    async close(): Promise<void> {
        this.#client.release();
    }

    /**
     * Commits the current transaction
     * @returns {Promise<void>} Promise that resolves when transaction is committed
     */
    async commit(): Promise<void> {
        await this.#client.query('COMMIT')
    }

    /**
     * Rolls back the current transaction
     * @returns {Promise<void>} Promise that resolves when transaction is rolled back
     */
    async rollback(): Promise<void> {
        try {
            await this.#client.query('ROLLBACK')
        } catch (e) {
            this.logger.error('Cannot rollback the database.\n' + e);
        }
    }

    /**
     * Executes a SQL query
     * @param {string} sql - SQL query to execute
     * @returns {Promise<any>} Promise that resolves with query result
     * @protected
     */
    protected executeSQL(sql: string): Promise<any> {
        return this.#client.query(sql);
    }

    /**
     * Executes an UPDATE SQL query
     * @param {string} sql - UPDATE SQL query
     * @param {any[]} params - Query parameters
     * @returns {Promise<number>} Promise that resolves with number of affected rows
     */
    async executeUpdate(sql: string, params: any[]): Promise<number> {
        this.logger.debug(sql, params);
        let result: Result = await this.#client.query(sql, params);
        return result.rowCount;
    }

    /**
     * Extracts field definitions from query result
     * @param {any} result - Query result object
     * @returns {Array<Field>} Array of field definitions
     */
    getFields(result: any): Array<Field> {
        const list: Array<Field> = [];
        if (result && result.fields) {
            result.fields.forEach((field: any) => {
                const type = this.getFieldType(field);
                list.push({name: this.toCamel(field.name), type});
            })
        }
        return list;
    }

    /**
     * Extracts row data from query result
     * @param {any} result - Query result object
     * @returns {Array<any>} Array of row data
     * @protected
     */
    protected getRowSet(result: any): Array<any> {
        return result.rows;
    }

    /**
     * Gets the number of affected rows from query result
     * @param {any} result - Query result object
     * @returns {number} Number of affected rows
     */
    getAffectRows(result: any): number {
        return result.rowCount;
    }

    /**
     * Builds a mapping of field names to camelCase names
     * @param {Array<any>} fields - Array of field objects
     * @returns {Map<string, string>} Map of field names to camelCase names
     * @protected
     */
    protected buildFieldsMap(fields: Array<any>): Map<string, string> {
        let map: Map<string, string> = new Map<string, string>();
        fields.forEach(field => {
            map.set(field.name, this.toCamel(field.name.toLowerCase()));
        });
        return map;
    }

    /**
     * Gets the first row from query result
     * @param {any} result - Query result object
     * @returns {any} First row data or null if no rows
     * @protected
     */
    protected getFirstRow(result: any): any {
        if (result.rows.length > 0) {
            let ds = {};
            result.fields.forEach((field: any) => {
                this.setNestObj(ds, field.name.toLowerCase(), result.rows[0][field.name]);
            });
            return ds;
        } else {
            return null;
        }
    }

    /**
     * Fetches data from database using SQL query
     * @param {string} sql - SQL query to execute
     * @param {Array<any> | null} params - Query parameters
     * @returns {Promise<any>} Promise that resolves with query result
     */
    async fetchData(sql: string, params: Array<any> | null = null): Promise<any> {
        this.logger.debug(sql, params);
        return this.#client.query(sql, params);
    }

    /**
     * Gets the field type for a database field
     * @param {any} _field - Database field object (currently unused)
     * @returns {FieldType} Field type (always returns Text for now)
     * @private
     */
    private getFieldType(_field: any): FieldType {
        return FieldType.Text;
    }

    /**
     * Deletes a record from the database
     * @param {string} sql - DELETE SQL query
     * @param {Array<any>} params - Query parameters
     * @returns {Promise<number>} Promise that resolves with number of deleted rows
     */
    deleteRecord(sql: string, params: Array<any>): Promise<number> {
        return this.executeUpdate(sql, params);
    }

    /**
     * Inserts a record into the database
     * @param {string} sql - INSERT SQL query
     * @param {Array<any>} params - Query parameters
     * @returns {Promise<any>} Promise that resolves with the inserted record data
     */
    async insertRecord(sql: string, params: Array<any>): Promise<any> {
        let result: Result = await this.#client.query(sql, params);
        this.logger.debug(sql, params);
        return this.getFirstRow(result);
    }

    /**
     * Updates a record in the database
     * @param {string} sql - UPDATE SQL query
     * @param {Array<any>} params - Query parameters
     * @returns {Promise<any>} Promise that resolves with the updated rows
     */
    async updateRecord(sql: string, params: Array<any>): Promise<any> {
        let result: Result = await this.#client.query(sql, params);
        this.logger.debug(sql, params);
        return this.getFirstRow(result);
    }
}

export type PostConnection = (client: PoolClient) => Promise<void>;

/**
 * PostgreSQL database factory implementation
 * Implements the DBFactory interface to provide PostgreSQL database connections
 */
class PgDBFactory implements DBFactory {

    /**
     * PostgreSQL connection pool
     * @private
     */
    #pool: Pool = null;

    /**
     * Creates a new PostgreSQL database factory
     * @param {any} config - PostgreSQL connection configuration
     * @param postConnection
     */
    constructor(config: any, postConnection: PostConnection) {
        this.#pool = new Pool(config);
        if (postConnection) {
            this.#pool.on('connect', async (client: PoolClient) => {
                await postConnection(client)
            })
        }
    }

    /**
     * Creates a new database connection from the pool
     * @returns {Promise<DBConnection>} Promise that resolves with a new database connection
     */
    async createDBConnection(): Promise<DBConnection> {
        const client: PoolClient = await this.#pool.connect();
        return new PgDBConnection(client);
    }
}

/**
 * Initializes a PostgreSQL database factory
 * @param {any} config - PostgreSQL connection configuration
 * @param postConnection
 * @returns {DBFactory} New PostgreSQL database factory instance
 */
export const initializePg = (config: any, postConnection: PostConnection = null): DBFactory => {
    return new PgDBFactory(config, postConnection);
}

