import db from "../db.js";
import CourseTable from "./CourseTable.js";
import UserTable from "./UserTable.js";

const CourseMemberTable = {
    name: 'course_members',
    columns: {
        COURSE_ID: 'course_id',
        STUDENT_ID: 'student_id',
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
            table.integer(this.columns.COURSE_ID).notNullable()
                .references(CourseTable.columns.ID).inTable(CourseTable.name)
                .onDelete('CASCADE');
            table.integer(this.columns.STUDENT_ID).notNullable()
                .references(UserTable.columns.ID).inTable(UserTable.name);
            table.timestamp(this.columns.CREATED_AT).notNullable();
            table.timestamp(this.columns.UPDATED_AT).notNullable();
            table.primary([this.columns.COURSE_ID, this.columns.STUDENT_ID]);
        });
    },
};

export default CourseMemberTable;
