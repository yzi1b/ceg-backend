
export default class Submission {
    constructor(examId, studentId, paperId, answers, score, submittedAt) {
        this.examId = examId;
        this.studentId = studentId;
        this.paperId = paperId;
        this.answers = answers;
        this.score = score;
        this.submittedAt = submittedAt;
    }

    static fromRecord(record) {
        return new Submission(
            record.exam_id, record.student_id, record.paper_id,
            record.answers, record.score, record.submitted_at
        );
    }

    toRecord() {
        return {
            exam_id: this.examId,
            student_id: this.studentId,
            paper_id: this.paperId,
            answers: this.answers,
            score: this.score,
            submitted_at: this.submittedAt,
        };
    }
}
