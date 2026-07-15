import db from "../db.js";
import User from "../entities/User.js";

const UserTable = {
    name: "users",
    columns: {
        ID: 'id',
        ACCOUNT_ID: 'account_id',
        USER_NAME: 'user_name',
        PASSWORD_HASH: 'password_hash',
        PASSWORD_SALT: 'password_salt',
        ROLE: 'role',
        FULL_NAME: 'full_name',
        GENDER: 'gender',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at',
    },
    errors: {
        USER_NAME_EXIST: 'user name has already existed',
    },

    async exists() {
        return await db.schema.hasTable(this.name);
    },

    t() {
        return db.table(this.name);
    },

    async create() {
        await db.schema.createTable(this.name, (table) => {
            table.increments(this.columns.ID).primary();
            table.integer(this.columns.ACCOUNT_ID).notNullable().unique();
            table.string(this.columns.USER_NAME, 16,).notNullable().unique();
            table.string(this.columns.PASSWORD_HASH, 64).notNullable();
            table.string(this.columns.PASSWORD_SALT, 32).notNullable();
            table.string(this.columns.ROLE, 16).notNullable();
            table.string(this.columns.FULL_NAME, 64).notNullable();
            table.boolean(this.columns.GENDER).notNullable();
            table.timestamp(this.columns.CREATED_AT).notNullable();
            table.timestamp(this.columns.UPDATED_AT).notNullable();
        });
    },

    async findById(id) {
        const raw = await this.t().where(this.columns.ID, id).first();
        if (!raw) {
            return null;
        }
        return User.fromRecord(raw);
    },

    async findByAccountId(accountId) {
        const raw = await this.t().where(this.columns.ACCOUNT_ID, accountId).first()
        if (!raw) {
            return null;
        }
        return User.fromRecord(raw);
    },

    async findByUserName(userName) {
        const raw = await this.t().where(this.columns.USER_NAME, userName).first();
        if (!raw) {
            return null;
        }
        return User.fromRecord(raw);
    },

    async listAll() {
        const raws = await this.t();
        return raws.map(User.fromRecord);
    },

    async hasAdmin() {
        return this.t().where(this.columns.ROLE, User.Role.ADMIN).first();
    },

    async newUser(user) {
        if (await UserTable.findByUserName(user.userName)) {
            throw new Error(UserTable.errors.USER_NAME_EXIST);
        }

        const raw = user.toRecord();
        delete raw.id;
        raw.created_at = new Date();
        raw.updated_at = new Date();

        const [newRaw] = await this.t().insert(raw).returning('*');

        return User.fromRecord(newRaw);
    },

    async updateUser(user) {
        const raw = user.toRecord();
        delete raw.id;
        delete raw.created_at;
        raw.updated_at = new Date();

        const [updatedRaw] = await this.t()
            .where(this.columns.ID, user.id)
            .update(raw)
            .returning('*');

        return User.fromRecord(User.fromRecord(updatedRaw));
    },

    async dropUser(id) {
        await this.t().where(this.columns.ID, id).del();
    }
};

export default UserTable;
