import DisplayableId from "../objects/DisplayableId.js";

export default class Exam {
    constructor(id, courseId, title, createdAt, updatedAt) {
        this.id = id;
        this.courseId = courseId;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromRecord(record) {
        return new Exam(
            new DisplayableId(record.id),
            record.course_id, record.title,
            record.created_at, record.updated_at
        );
    }

    toRecord() {
        return {
            id: this.id.raw(),
            course_id: this.courseId,
            title: this.title,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }
}
