import DisplayableId from "../objects/DisplayableId.js";

export default class Paper {
    static Stage = {
        OPENING: 'opening',
        OBJECTING: 'objecting',
        GRADING: 'grading',
        CALCULATING: 'calculating',
        ARCHIVED: 'archived',
    }

    constructor(id, examId, title, questions, answers, stage, createdAt, updatedAt) {
        this.id = id;
        this.examId = examId;
        this.title = title;
        this.questions = questions;
        this.answers = answers;
        this.stage = stage;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromRecord(record) {
        return new Paper(
            new DisplayableId(record.id),
            record.exam_id, record.title,
            record.questions, record.answers, record.stage,
            record.created_at, record.updated_at
        );
    }

    toRecord() {
        return {
            id: this.id.raw(),
            exam_id: this.examId,
            title: this.title,
            questions: this.questions,
            answers: this.answers,
            stage: this.stage,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }

    static create(examId, title) {
        return new Paper(
            new DisplayableId(-1), examId, title,
            [], [], Paper.Stage.OPENING, 0, 0
        );
    }

    toJsonSummary() {
        return {
            id: this.id.toDisplay(),
            examId: this.examId,
            title: this.title,
            stage: this.stage,
            createdAt: this.createdAt instanceof Date ? this.createdAt.getTime() : this.createdAt,
        };
    }

    toJsonDetail() {
        return {
            id: this.id.toDisplay(),
            examId: this.examId,
            title: this.title,
            questions: this.questions,
            answers: this.answers,
            stage: this.stage,
            createdAt: this.createdAt instanceof Date ? this.createdAt.getTime() : this.createdAt,
        };
    }
}
