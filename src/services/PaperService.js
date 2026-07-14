import Paper from "../entities/Paper.js";
import PaperTable from "../tables/PaperTable.js";
import ExamTable from "../tables/ExamTable.js";
import CourseTable from "../tables/CourseTable.js";
import Exam from "../entities/Exam.js";
import User from "../entities/User.js";
import PaperContent from "../objects/PaperContent.js";
import AbstractQuestion from "../objects/questions/AbstractQuestion.js";

const PaperService = {
    errors: {
        EXAM_NOT_EXIST: 'exam does not exist',
        PAPER_NOT_EXIST: 'paper does not exist',
        NOT_PREPARING: 'exam is not in preparing stage',
        FORBIDDEN: 'you do not have permission',
        QUESTIONS_INVALID: 'questions format is invalid',
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
