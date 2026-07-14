
export default class Submission {
    constructor(examId, studentId, paperId, answers, submit, scores, total, submittedAt) {
        this.examId = examId;
        this.studentId = studentId;
        this.paperId = paperId;
        this.answers = answers;
        this.submit = submit; // bool，是否提交。为 false 则为保存而不提交
        this.scores = scores; // 逐题评分，为 int 数组
        this.total = total;
        this.submittedAt = submittedAt;
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
            submitted_at: this.submittedAt,
        };
    }
}
