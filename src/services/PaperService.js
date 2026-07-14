import Paper from "../entities/Paper.js";
import PaperTable from "../tables/PaperTable.js";
import ExamTable from "../tables/ExamTable.js";
import CourseTable from "../tables/CourseTable.js";
import Exam from "../entities/Exam.js";
import User from "../entities/User.js";
import PaperContent from "../objects/PaperContent.js";
import AbstractQuestion from "../objects/questions/AbstractQuestion.js";
import SubmissionTable from "../tables/SubmissionTable.js";
import GradeToken from "../objects/GradeToken.js";

const PaperService = {
    errors: {
        EXAM_NOT_EXIST: 'exam does not exist',
        PAPER_NOT_EXIST: 'paper does not exist',
        NOT_PREPARING: 'exam is not in preparing stage',
        FORBIDDEN: 'you do not have permission',
        QUESTIONS_INVALID: 'questions format is invalid',
        NOT_GRADING: 'exam is not in grading stage',
        INVALID_PAPER_STAGE: 'paper stage is invalid for this operation',
        QUESTION_NOT_SUBJECTIVE: 'question is not subjective',
        NEXT_NOT_FOUND: 'no ungraded submission found',
        INVALID_TOKEN: 'grade token is invalid',
        TOKEN_EXPIRED: 'grade token has expired',
        ALREADY_GRADED: 'this question has already been graded',
        SUBMISSION_NOT_FOUND: 'submission not found',
        SCORE_EXCEEDS_MAX: 'score exceeds the maximum for this question',
        INCOMPLETE_GRADING: 'not all questions have been graded',
    },

    create: async function (examId, visitor, title) {
        if (!title || !title.trim()) {
            throw new Error(PaperService.errors.QUESTIONS_INVALID);
        }

        const exam = await ExamTable.getExamById(examId);

        if (!exam) {
            throw new Error(PaperService.errors.EXAM_NOT_EXIST);
        }

        if (exam.stage !== Exam.Stage.PREPARING) {
            throw new Error(PaperService.errors.NOT_PREPARING);
        }

        const course = await CourseTable.getCourseById(exam.courseId);

        if (!course || course.owner !== visitor.id) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        const paper = Paper.create(examId, title);

        return await PaperTable.createPaper(paper);
    },

    list: async function (examId, visitor) {
        const exam = await ExamTable.getExamById(examId);

        if (!exam) {
            return [];
        }

        const course = await CourseTable.getCourseById(exam.courseId);

        if (!course) {
            return [];
        }

        if (!await PaperService.hasPermission(course, visitor)) {
            return [];
        }

        return await PaperTable.listPapersByExamId(examId);
    },

    info: async function (paperId, visitor) {
        if (!paperId.isValid()) {
            return null;
        }

        const paper = await PaperTable.getPaperById(paperId.raw());

        if (!paper) {
            return null;
        }

        const exam = await ExamTable.getExamById(paper.examId);

        if (!exam) {
            return null;
        }

        const course = await CourseTable.getCourseById(exam.courseId);

        if (!course) {
            return null;
        }

        if (await PaperService.hasPermission(course, visitor)) {
            return paper;
        }

        return null;
    },

    // 覆盖保存试卷的题目和答案（仅 preparing 阶段可操作）
    saveContent: async function (paperId, visitor, questions, answers) {
        if (!paperId.isValid()) {
            throw new Error(PaperService.errors.PAPER_NOT_EXIST);
        }

        const paper = await PaperTable.getPaperById(paperId.raw());

        if (!paper) {
            throw new Error(PaperService.errors.PAPER_NOT_EXIST);
        }

        const exam = await ExamTable.getExamById(paper.examId);

        if (!exam || exam.stage !== Exam.Stage.PREPARING) {
            throw new Error(PaperService.errors.NOT_PREPARING);
        }

        const course = await CourseTable.getCourseById(exam.courseId);

        if (!course || course.owner !== visitor.id) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        // 经过 PaperContent 校验，剔除额外字段，重新导出
        if (Array.isArray(questions) && Array.isArray(answers)
            && questions.length > 0 && questions.length === answers.length) {
            try {
                const content = PaperContent.from(paper.title, questions, answers);
                paper.questions = content.getQRaw();
                paper.answers = content.getARaw();
            } catch (e) {
                if (e.message === PaperContent.errors.QUESTION_PHASE_ERROR
                    || e.message === AbstractQuestion.errors.QUESTION_INVALID
                    || e.message === AbstractQuestion.errors.ANSWER_INVALID) {
                    throw new Error(PaperService.errors.QUESTIONS_INVALID);
                } else {
                    throw e;
                }
            }
        } else if (Array.isArray(questions) && Array.isArray(answers)
            && questions.length === 0 && answers.length === 0) {
            // 提交空数组，清空题目和答案
            paper.questions = questions;
            paper.answers = answers;
        } else {
            throw new Error(PaperService.errors.QUESTIONS_INVALID);
        }

        return await PaperTable.updatePaper(paper);
    },

    startGrading: async function (paperId, visitor) {
        const paper = await PaperTable.getPaperById(paperId);
        if (!paper) {
            throw new Error(PaperService.errors.PAPER_NOT_EXIST);
        }

        const exam = await ExamTable.getExamById(paper.examId);
        if (!exam || exam.stage !== Exam.Stage.GRADING) {
            throw new Error(PaperService.errors.NOT_GRADING);
        }

        if (paper.stage !== Paper.Stage.OPENING) {
            throw new Error(PaperService.errors.INVALID_PAPER_STAGE);
        }

        const course = await CourseTable.getCourseById(exam.courseId);
        if (!course || course.owner !== visitor.id) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        // 解析题目对象，获得 score() / isSubjective() 方法
        let questions;
        try {
            const content = PaperContent.from(paper.title, paper.questions, paper.answers);
            questions = content.questions;
        } catch (e) {
            if (e.message === PaperContent.errors.QUESTION_PHASE_ERROR
                || e.message === AbstractQuestion.errors.QUESTION_INVALID) {
                throw new Error(PaperService.errors.QUESTIONS_INVALID);
            }
            throw e;
        }

        // 试卷进入 objecting 阶段
        paper.stage = Paper.Stage.OBJECTING;
        await PaperTable.updatePaper(paper);

        // 获取该场考试下所有分配到该试卷的提交
        const allSubmissions = await SubmissionTable.listByExam(paper.examId);
        const paperSubmissions = allSubmissions.filter(s => s.paperId === paperId);

        const hasSubjective = questions.some(q => q.isSubjective());

        for (const submission of paperSubmissions) {
            submission.submit = true;

            const scores = [];
            for (let i = 0; i < questions.length; i++) {
                if (questions[i].isSubjective()) {
                    scores.push(-1);
                } else {
                    const studentAnswer = submission.answers ? submission.answers[i] : undefined;
                    scores.push(questions[i].score(studentAnswer));
                }
            }
            submission.scores = scores;

            submission.total = hasSubjective ? -1 : scores.reduce((a, b) => a + b, 0);

            await SubmissionTable.updateSubmission(submission);
        }

        // 设定最终试卷阶段
        paper.stage = hasSubjective ? Paper.Stage.GRADING : Paper.Stage.ARCHIVED;
        await PaperTable.updatePaper(paper);

        return paper;
    },

    gradeTasks: async function (paperId, visitor) {
        const paper = await PaperTable.getPaperById(paperId);
        if (!paper) {
            throw new Error(PaperService.errors.PAPER_NOT_EXIST);
        }

        const exam = await ExamTable.getExamById(paper.examId);
        if (!exam) {
            throw new Error(PaperService.errors.EXAM_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(exam.courseId);
        if (!course || course.owner !== visitor.id) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        // 解析题目，找出主观题索引
        let questions;
        try {
            const content = PaperContent.from(paper.title, paper.questions, paper.answers);
            questions = content.questions;
        } catch {
            return { finished: true, submissions: 0, questions: [] };
        }

        const subjectiveIndices = [];
        for (let i = 0; i < questions.length; i++) {
            if (questions[i].isSubjective()) {
                subjectiveIndices.push(i);
            }
        }

        const allSubmissions = await SubmissionTable.listByExam(paper.examId);
        const paperSubmissions = allSubmissions.filter(s => s.paperId === paperId);

        if (subjectiveIndices.length === 0) {
            return {
                finished: true,
                submissions: paperSubmissions.length,
                questions: [],
            };
        }

        const questionsResult = subjectiveIndices.map(idx => {
            let graded = 0;
            for (const sub of paperSubmissions) {
                if (sub.scores?.[idx] !== undefined && sub.scores[idx] !== -1) {
                    graded++;
                }
            }
            return { index: idx, graded };
        });

        const allGraded = questionsResult.every(q => q.graded === paperSubmissions.length);

        return {
            finished: allGraded,
            submissions: paperSubmissions.length,
            questions: questionsResult,
        };
    },

    // 统一判断试卷是否处于可批阅状态
    assertGradable: function (paper) {
        if (paper.stage !== Paper.Stage.OBJECTING && paper.stage !== Paper.Stage.GRADING) {
            throw new Error(PaperService.errors.INVALID_PAPER_STAGE);
        }
    },

    gradeNext: async function (paperId, questionIndex, visitor) {
        const paper = await PaperTable.getPaperById(paperId);
        if (!paper) {
            throw new Error(PaperService.errors.PAPER_NOT_EXIST);
        }

        PaperService.assertGradable(paper);

        const exam = await ExamTable.getExamById(paper.examId);
        if (!exam) {
            throw new Error(PaperService.errors.EXAM_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(exam.courseId);
        if (!course || course.owner !== visitor.id) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        // 解析题目，验证 questionIndex 合法性
        let questions;
        try {
            const content = PaperContent.from(paper.title, paper.questions, paper.answers);
            questions = content.questions;
        } catch {
            throw new Error(PaperService.errors.QUESTIONS_INVALID);
        }

        if (questionIndex < 0 || questionIndex >= questions.length) {
            throw new Error(PaperService.errors.QUESTIONS_INVALID);
        }

        if (!questions[questionIndex].isSubjective()) {
            throw new Error(PaperService.errors.QUESTION_NOT_SUBJECTIVE);
        }

        // 找到该试卷下未评分的提交
        const allSubmissions = await SubmissionTable.listByExam(paper.examId);
        const paperSubmissions = allSubmissions.filter(s => s.paperId === paperId);

        const ungraded = paperSubmissions.filter(s =>
            s.scores && s.scores[questionIndex] === -1
        );

        if (ungraded.length === 0) {
            return { found: false, question: null, answer: null, token: null };
        }

        const target = ungraded[Math.floor(Math.random() * ungraded.length)];

        // 在已知 exam 的上下文中，studentId 即 submissionId
        const submissionId = target.studentId;
        const token = GradeToken.create(
            submissionId, questionIndex, visitor.id, 3_600_000
        ).toToken();

        return {
            found: true,
            question: paper.questions[questionIndex],
            answer: target.answers ? target.answers[questionIndex] : null,
            token,
        };
    },

    gradeScore: async function (paperId, visitor, token, score) {
        let gt;
        try {
            gt = GradeToken.fromToken(token);
        } catch {
            throw new Error(PaperService.errors.INVALID_TOKEN);
        }

        if (!gt.isValid()) {
            throw new Error(PaperService.errors.TOKEN_EXPIRED);
        }

        if (gt.userId !== visitor.id) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        const paper = await PaperTable.getPaperById(paperId);
        if (!paper) {
            throw new Error(PaperService.errors.PAPER_NOT_EXIST);
        }

        PaperService.assertGradable(paper);

        const exam = await ExamTable.getExamById(paper.examId);
        if (!exam) {
            throw new Error(PaperService.errors.EXAM_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(exam.courseId);
        if (!course || course.owner !== visitor.id) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        const submission = await SubmissionTable.getSubmission(paper.examId, gt.submissionId);
        if (!submission) {
            throw new Error(PaperService.errors.SUBMISSION_NOT_FOUND);
        }

        // 已在 gradeNext 中按 paperId 过滤，但防御性检查
        if (submission.paperId !== paperId) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        if (!submission.scores || submission.scores[gt.questionIndex] === undefined
            || submission.scores[gt.questionIndex] !== -1) {
            throw new Error(PaperService.errors.ALREADY_GRADED);
        }

        // 解析题目，验证为主观题且分数不超过满分
        let questions;
        try {
            const content = PaperContent.from(paper.title, paper.questions, paper.answers);
            questions = content.questions;
        } catch {
            throw new Error(PaperService.errors.QUESTIONS_INVALID);
        }

        if (!questions[gt.questionIndex].isSubjective()) {
            throw new Error(PaperService.errors.QUESTION_NOT_SUBJECTIVE);
        }

        if (!Number.isFinite(score) || score < 0 || score > questions[gt.questionIndex].getFull()) {
            throw new Error(PaperService.errors.SCORE_EXCEEDS_MAX);
        }

        submission.scores[gt.questionIndex] = score;
        await SubmissionTable.updateSubmission(submission);

        return { score };
    },

    gradeFinish: async function (paperId, visitor) {
        const paper = await PaperTable.getPaperById(paperId);
        if (!paper) {
            throw new Error(PaperService.errors.PAPER_NOT_EXIST);
        }

        PaperService.assertGradable(paper);

        const exam = await ExamTable.getExamById(paper.examId);
        const course = await CourseTable.getCourseById(exam.courseId);
        if (!course || course.owner !== visitor.id) {
            throw new Error(PaperService.errors.FORBIDDEN);
        }

        // 获取该试卷下所有提交
        const allSubmissions = await SubmissionTable.listByExam(paper.examId);
        const paperSubmissions = allSubmissions.filter(s => s.paperId === paperId);

        // 校验所有提交的所有题目均已评分
        for (const sub of paperSubmissions) {
            if (!Array.isArray(sub.scores) || sub.scores.length === 0 || sub.scores.includes(-1)) {
                throw new Error(PaperService.errors.INCOMPLETE_GRADING);
            }
        }

        // 进入 calculating 阶段
        paper.stage = Paper.Stage.CALCULATING;
        await PaperTable.updatePaper(paper);

        // 计算总分
        for (const sub of paperSubmissions) {
            sub.total = sub.scores.reduce((a, b) => a + b, 0);
            await SubmissionTable.updateSubmission(sub);
        }

        // 归档
        paper.stage = Paper.Stage.ARCHIVED;
        await PaperTable.updatePaper(paper);

        return paper;
    },

    hasPermission: async function (course, visitor) {
        if (visitor.role === User.Role.ADMIN) {
            return true;
        } else if (visitor.role === User.Role.TEACHER) {
            return course.owner === visitor.id;
        } else if (visitor.role === User.Role.STUDENT) {
            return false;
        }

        return false;
    },
};

export default PaperService;
