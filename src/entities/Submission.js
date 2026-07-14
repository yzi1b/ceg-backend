
export default class Submission {
    static Status = {
        NOT_TAKEN: 'not_taken',     // 未参考
        IN_PROGRESS: 'in_progress', // 一开始
        SUBMITTED: 'submitted',     // 已提交
    };

    constructor(examId, studentId, paperId, answers, submit, scores, total, startedAt) {
        this.examId = examId;
        this.studentId = studentId;
        this.paperId = paperId;
        this.answers = answers;
        this.submit = submit;
        this.scores = scores;
        this.total = total;
        this.startedAt = startedAt;
    }

    static fromRecord(record) {
        return new Submission(
            record.exam_id, record.student_id, record.paper_id,
            record.answers, record.submit, record.scores, record.total,
            record.submitted_at
        );
    }

    static create(examId, studentId, paperId) {
        return new Submission(examId, studentId, paperId, [], false, null, null, new Date());
    }

    toRecord() {
        return {
            exam_id: this.examId,
            student_id: this.studentId,
            paper_id: this.paperId,
            answers: this.answers,
            submit: this.submit,
            scores: this.scores,
            total: this.total,
            submitted_at: this.startedAt,
        };
    }
}
