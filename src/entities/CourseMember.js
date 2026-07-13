
export default class CourseMember {
    constructor(courseId, studentId, createdAt, updatedAt) {
        this.courseId = courseId;
        this.studentId = studentId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromRecord(record) {
        return new CourseMember(
            record.course_id, record.student_id, record.created_at, record.updated_at
        );
    }

    toRecord() {
        return {
            course_id: this.courseId,
            student_id: this.studentId,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        }
    }
}