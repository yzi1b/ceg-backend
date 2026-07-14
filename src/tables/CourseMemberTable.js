import db from "../db.js";
import CourseTable from "./CourseTable.js";
import UserTable from "./UserTable.js";
import User from "../entities/User.js";
import CourseMember from "../entities/CourseMember.js";

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

    async addMember(courseId, studentId) {
        const now = new Date();
        const [raw] = await this.t()
            .insert({
                [this.columns.COURSE_ID]: courseId,
                [this.columns.STUDENT_ID]: studentId,
                [this.columns.CREATED_AT]: now,
                [this.columns.UPDATED_AT]: now,
            })
            .returning('*');
        return CourseMember.fromRecord(raw);
    },

    async removeMember(courseId, studentId) {
        await this.t()
            .where({ [this.columns.COURSE_ID]: courseId, [this.columns.STUDENT_ID]: studentId })
            .del();
    },

    async isMember(courseId, studentId) {
        const row = await this.t()
            .where({ [this.columns.COURSE_ID]: courseId, [this.columns.STUDENT_ID]: studentId })
            .first();
        return !!row;
    },

    async listStudentsByCourse(courseId) {
        const raws = await this.t()
            .join(UserTable.name, this.columns.STUDENT_ID, `${UserTable.name}.${UserTable.columns.ID}`)
            .where(this.columns.COURSE_ID, courseId)
            .select(`${UserTable.name}.*`);
        return raws.map(User.fromRecord);
    },
};

export default CourseMemberTable;
