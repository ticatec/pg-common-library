import {DBConnection, DBFactory} from "@ticatec/node-common-library";
import {Client, Pool, Result} from 'pg';
import Field, {FieldType} from "@ticatec/node-common-library/lib/db/Field";


class PgDBConnection extends DBConnection {


    #client: Client;

    constructor(conn) {
        super();
        this.#client = conn;
    }

    async beginTransaction(): Promise<void> {
        await this.#client.query('BEGIN');
        return
    }

    async close(): Promise<void> {
        await this.#client.release();
    }

    async commit(): Promise<void> {
        await this.#client.query('COMMIT')
    }

    async rollback(): Promise<void> {
        try {
            await this.#client.query('ROLLBACK')
        } catch (e) {
            this.logger.error('Cannot rollback the database.\n' + e);
        }
    }

    protected executeSQL(sql: string): Promise<any> {
        return this.#client.query(sql);
    }

    async executeUpdate(sql: string, params): Promise<number> {
        let result:Result = await this.#client.query(sql, params);
        return result.rowCount;
    }

    getFields(result: any): Array<Field> {
        const list: Array<Field> = [];
        if (result && result.fields) {
            result.fields.forEach(field => {
                const type = this.getFieldType(field);
                list.push({name: this.toCamel(field.name), type});
            })
        }
        return list;
    }

    protected getRowSet(result: any): Array<any> {
        return result.rows;
    }

    getAffectRows(result): number {
        return result.rowCount;
    }

    protected buildFieldsMap(fields: Array<any>): Map<string, string> {
        let map: Map<string, string> = new Map<string, string>();
        fields.forEach(field => {
            map.set(field.name, this.toCamel(field.name.toLowerCase()));
        });
        return map;
    }

    protected getFirstRow(result: any): any {
        if (result.rows.length > 0) {
            let ds = {};
            result.fields.forEach(field => {
                this.setNestObj(ds, field.name.toLowerCase(), result.rows[0][field.name]);
            });
            return ds;
        } else {
            return null;
        }
    }

    async fetchData(sql: string, params: Array<any> | void): Promise<any> {
        return await this.#client.query(sql, params);
    }

    private getFieldType(field): FieldType {
        return FieldType.Text;
    }

    deleteRecord(sql: string, params: Array<any>): Promise<number> {
        return this.executeUpdate(sql, params);
    }

    async insertRecord(sql: string, params: Array<any>): Promise<any> {
        let result:Result = await this.#client.query(sql, params);
        return this.getFirstRow(result);
    }

    updateRecord(sql: string, params: Array<any>): Promise<number> {
        return this.executeUpdate(sql, params);
    }
}

class PgDBFactory implements DBFactory {

    #pool: Pool = null;

    constructor(config: any) {
        this.#pool = new Pool(config);
    }

    async createDBConnection(): Promise<DBConnection> {
        let client = await this.#pool.connect();
        return new PgDBConnection(client);
    }

}



export const initializePg = (config):DBFactory => {
    return new PgDBFactory(config);
}

