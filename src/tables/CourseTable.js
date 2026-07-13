import db from "../db.js";
import Course from "../entities/Course.js";
import UserTable from "./UserTable.js";

const CourseTable = {
    name: 'courses',
    columns: {
        ID: 'id',
        TITLE: 'title',
        OWNER: 'owner',
        INVITE_CODE: 'invite_code',
        INVITE_CODE_EXPIRES_AT: 'invite_code_expires_at',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at',
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
            table.string(this.columns.TITLE, 32).notNullable();
            table.integer(this.columns.OWNER).notNullable()
                .references(UserTable.columns.ID).inTable(UserTable.name);
            table.string(this.columns.INVITE_CODE, 16).unique();
            table.timestamp(this.columns.INVITE_CODE_EXPIRES_AT);
            table.timestamp(this.columns.CREATED_AT).notNullable();
            table.timestamp(this.columns.UPDATED_AT).notNullable();
        });
    },

    async createCourse(course) {
        const raw = course.toRecord();
        delete raw.id;
        raw.created_at = new Date();
        raw.updated_at = new Date();

        const [newRaw] = await this.t().insert(raw).returning('*');

        return Course.fromRecord(newRaw);
    },

    async listCoursesByOwner(owner) {
        const raws = await this.t().where({ [this.columns.OWNER]: owner });
        return raws.map(Course.fromRecord);
    },

    async getCourseById(id) {
        const raw = await this.t().where(this.columns.ID, id).first();
        return raw ? Course.fromRecord(raw) : null;
    },

    async dropCourse(courseId) {
        const record = await this.t().where({ [this.columns.ID]: courseId }).del().returning("*");
        return Course.fromRecord(record);
    }
};

export default CourseTable;
