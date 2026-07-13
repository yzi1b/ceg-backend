import db from "../db.js";
import UserTable from "./UserTable.js";
import PaperTable from "./PaperTable.js";
import ExamTable from "./ExamTable.js";

const SubmissionTable = {
    name: 'submissions',
    columns: {
        EXAM_ID: 'exam_id',
        STUDENT_ID: 'student_id',
        PAPER_ID: 'paper_id',
        ANSWERS: 'answers',
        SCORE: 'score',
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
            table.jsonb(this.columns.SCORE);
            table.timestamp(this.columns.SUBMITTED_AT).notNullable();
            table.primary([this.columns.EXAM_ID, this.columns.STUDENT_ID]);
        });
    },
};

export default SubmissionTable;
