import DisplayableId from "../objects/DisplayableId.js";

export default class Exam {
    static Stage = {
        PREPARING: 'preparing',
        OPENING: 'opening',
        GRADING: 'grading',
        ARCHIVED: 'archived',
    }

    static patterns = {
        TITLE: /^(?!.* {2})\S[\S ]{0,30}\S$/,
    }

    constructor(id, courseId, title, full, stage, startsAt, endsAt, duration, createdAt, updatedAt) {
        this.id = id;
        this.courseId = courseId;
        this.title = title;
        this.full = full;
        this.stage = stage;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.duration = duration;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromRecord(record) {
        return new Exam(
            new DisplayableId(record.id),
            record.course_id, record.title, record.full, record.stage,
            record.starts_at, record.ends_at, record.duration,
            record.created_at, record.updated_at
        );
    }

    toRecord() {
        return {
            id: this.id.raw(),
            course_id: this.courseId,
            title: this.title,
            full: this.full,
            stage: this.stage,
            starts_at: this.startsAt,
            ends_at: this.endsAt,
            duration: this.duration,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }

    static create(courseId, title, full, startsAt, endsAt, duration) {
        return new Exam(
            new DisplayableId(-1), courseId, title, full,
            Exam.Stage.PREPARING, startsAt, endsAt, duration, 0, 0
        );
    }

    toJsonSummary() {
        return {
            id: this.id.toDisplay(),
            courseId: new DisplayableId(this.courseId).toDisplay(),
            title: this.title,
            full: this.full,
            stage: this.stage,
            startsAt: this.startsAt instanceof Date ? this.startsAt.getTime() : this.startsAt,
            endsAt: this.endsAt instanceof Date ? this.endsAt.getTime() : this.endsAt,
            duration: this.duration,
            createdAt: this.createdAt instanceof Date ? this.createdAt.getTime() : this.createdAt,
        };
    }
}
