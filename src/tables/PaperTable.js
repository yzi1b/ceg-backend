import db from "../db.js";
import ExamTable from "./ExamTable.js";
import Paper from "../entities/Paper.js";

const PaperTable = {
    name: 'papers',
    columns: {
        ID: 'id',
        EXAM_ID: 'exam_id',
        TITLE: 'title',
        QUESTIONS: 'questions',
        ANSWERS: 'answers',
        STAGE: 'stage',
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
            table.string(this.columns.STAGE, 16).notNullable();
            table.timestamp(this.columns.CREATED_AT).notNullable();
            table.timestamp(this.columns.UPDATED_AT).notNullable();
        });
    },

    async createPaper(paper) {
        const raw = paper.toRecord();
        delete raw.id;
        raw.created_at = new Date();
        raw.updated_at = new Date();

        raw[this.columns.QUESTIONS] = JSON.stringify(raw[this.columns.QUESTIONS]);
        raw[this.columns.ANSWERS] = JSON.stringify(raw[this.columns.ANSWERS]);

        const [newRaw] = await this.t().insert(raw).returning('*');

        return Paper.fromRecord(newRaw);
    },

    async getPaperById(id) {
        const raw = await this.t().where(this.columns.ID, id).first();
        return raw ? Paper.fromRecord(raw) : null;
    },

    async listPapersByExamId(examId) {
        const raws = await this.t().where({ [this.columns.EXAM_ID]: examId });
        return raws.map(Paper.fromRecord);
    },

    async updatePaper(paper) {
        const raw = paper.toRecord();
        raw.updated_at = new Date();

        // 显式序列化 jsonb 列，避免 pg 驱动误将数组当作 PG 数组处理
        raw[this.columns.QUESTIONS] = JSON.stringify(raw[this.columns.QUESTIONS]);
        raw[this.columns.ANSWERS] = JSON.stringify(raw[this.columns.ANSWERS]);

        const [newRaw] = await this.t()
            .where({ [this.columns.ID]: raw.id })
            .update(raw)
            .returning('*');

        return Paper.fromRecord(newRaw);
    },
};

export default PaperTable;
