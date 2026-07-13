import db from "../db.js";
import CourseTable from "./CourseTable.js";

const ExamTable = {
    name: 'exams',
    columns: {
        ID: 'id',
        COURSE_ID: 'course_id',
        TITLE: 'title',
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
            table.integer(this.columns.COURSE_ID).notNullable()
                .references(CourseTable.columns.ID).inTable(CourseTable.name)
                .onDelete('CASCADE');
            table.string(this.columns.TITLE, 32).notNullable();
            table.timestamp(this.columns.CREATED_AT).notNullable();
            table.timestamp(this.columns.UPDATED_AT).notNullable();
        });
    },
};

export default ExamTable;
