import db from "../db.js";
import UserTable from "./UserTable.js";
import PaperTable from "./PaperTable.js";
import ExamTable from "./ExamTable.js";
import Submission from "../entities/Submission.js";

const SubmissionTable = {
    name: 'submissions',
    columns: {
        EXAM_ID: 'exam_id',
        STUDENT_ID: 'student_id',
        PAPER_ID: 'paper_id',
        ANSWERS: 'answers',
        SUBMIT: 'submit',
        SCORES: 'scores',
        TOTAL: 'total',
        SUBMITTED_AT: 'submitted_at',
    },

    async exists() {
        return await db.schema.hasTable(this.name);
    },

    t() {
        return db.table(this.name);
    },

    async create() {
        await db.schema.createTable(this.name, (table) => {
            table.integer(this.columns.EXAM_ID).notNullable()
                .references(ExamTable.columns.ID).inTable(ExamTable.name)
                .onDelete('CASCADE');
            table.integer(this.columns.STUDENT_ID).notNullable()
                .references(UserTable.columns.ID).inTable(UserTable.name);
            table.integer(this.columns.PAPER_ID).notNullable()
                .references(PaperTable.columns.ID).inTable(PaperTable.name)
                .onDelete('CASCADE');
            table.jsonb(this.columns.ANSWERS).notNullable();
            table.boolean(this.columns.SUBMIT).notNullable().defaultTo(false);
            table.jsonb(this.columns.SCORES);
            table.double(this.columns.TOTAL);
            table.timestamp(this.columns.SUBMITTED_AT).notNullable();
            table.primary([this.columns.EXAM_ID, this.columns.STUDENT_ID]);
        });
    },

    async createSubmission(submission) {
        const raw = submission.toRecord();
        const [newRaw] = await this.t().insert(raw).returning('*');
        return Submission.fromRecord(newRaw);
    },

    async getSubmission(examId, studentId) {
        const raw = await this.t()
            .where({ [this.columns.EXAM_ID]: examId, [this.columns.STUDENT_ID]: studentId })
            .first();
        return raw ? Submission.fromRecord(raw) : null;
    },

    async listByExam(examId) {
        const raws = await this.t().where({ [this.columns.EXAM_ID]: examId });
        return raws.map(Submission.fromRecord);
    },

    async listByStudent(studentId) {
        const raws = await this.t().where({ [this.columns.STUDENT_ID]: studentId });
        return raws.map(Submission.fromRecord);
    },

    async updateSubmission(submission) {
        const raw = submission.toRecord();
        const [newRaw] = await this.t()
            .where({
                [this.columns.EXAM_ID]: raw.exam_id,
                [this.columns.STUDENT_ID]: raw.student_id,
            })
            .update(raw)
            .returning('*');
        return Submission.fromRecord(newRaw);
    },

    async deleteSubmission(examId, studentId) {
        const [raw] = await this.t()
            .where({ [this.columns.EXAM_ID]: examId, [this.columns.STUDENT_ID]: studentId })
            .del()
            .returning('*');
        return raw ? Submission.fromRecord(raw) : null;
    },
};

export default SubmissionTable;
