import DisplayableId from "../objects/DisplayableId.js";

export default class Paper {
    constructor(id, examId, title, questions, answers, createdAt, updatedAt) {
        this.id = id;
        this.examId = examId;
        this.title = title;
        this.questions = questions;
        this.answers = answers;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromRecord(record) {
        return new Paper(
            new DisplayableId(record.id),
            record.exam_id, record.title,
            record.questions, record.answers,
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
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }
}
