import db from "../db.js";
import ExamTable from "./ExamTable.js";

const PaperTable = {
    name: 'papers',
    columns: {
        ID: 'id',
        EXAM_ID: 'exam_id',
        TITLE: 'title',
        QUESTIONS: 'questions',
        ANSWERS: 'answers',
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
            table.integer(this.columns.EXAM_ID).notNullable()
                .references(ExamTable.columns.ID).inTable(ExamTable.name)
                .onDelete('CASCADE');
            table.string(this.columns.TITLE, 64).notNullable();
            table.jsonb(this.columns.QUESTIONS).notNullable();
            table.jsonb(this.columns.ANSWERS).notNullable();
            table.timestamp(this.columns.CREATED_AT).notNullable();
            table.timestamp(this.columns.UPDATED_AT).notNullable();
        });
    },
};

export default PaperTable;
