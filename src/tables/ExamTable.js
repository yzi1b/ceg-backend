import db from "../db.js";
import CourseTable from "./CourseTable.js";
import Exam from "../entities/Exam.js";

const ExamTable = {
    name: 'exams',
    columns: {
        ID: 'id',
        COURSE_ID: 'course_id',
        TITLE: 'title',
        FULL: 'full',
        STAGE: 'stage',
        STARTS_AT: 'starts_at',
        ENDS_AT: 'ends_at',
        DURATION: 'duration',
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
            table.integer(this.columns.FULL).notNullable();
            table.string(this.columns.STAGE, 16).notNullable();
            table.timestamp(this.columns.STARTS_AT).notNullable();
            table.timestamp(this.columns.ENDS_AT).notNullable();
            table.integer(this.columns.DURATION).notNullable();
            table.timestamp(this.columns.CREATED_AT).notNullable();
            table.timestamp(this.columns.UPDATED_AT).notNullable();
        });
    },

    async createExam(exam) {
        const raw = exam.toRecord();
        delete raw.id;
        raw.created_at = new Date();
        raw.updated_at = new Date();

        const [newRaw] = await this.t().insert(raw).returning('*');

        return Exam.fromRecord(newRaw);
    },

    async getExamById(id) {
        const raw = await this.t().where(this.columns.ID, id).first();
        return raw ? Exam.fromRecord(raw) : null;
    },

    async listExamsByCourseId(courseId) {
        const raws = await this.t().where({ [this.columns.COURSE_ID]: courseId });
        return raws.map(Exam.fromRecord);
    },

    async listExamsByCourseIds(courseIds) {
        const raws = await this.t()
            .whereIn(this.columns.COURSE_ID, courseIds)
            .orderBy(this.columns.STARTS_AT, 'asc')
            .orderBy(this.columns.ID, 'asc');
        return raws.map(Exam.fromRecord);
    },

    async updateExam(exam) {
        const raw = exam.toRecord();
        raw.updated_at = new Date();

        const [newRaw] = await this.t()
            .where({ [this.columns.ID]: raw.id })
            .update(raw)
            .returning('*');

        return Exam.fromRecord(newRaw);
    },

    async dropExam(examId) {
        const [record] = await this.t()
            .where({ [this.columns.ID]: examId })
            .del()
            .returning('*');

        return Exam.fromRecord(record);
    },
};

export default ExamTable;
