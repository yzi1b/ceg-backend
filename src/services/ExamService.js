import Exam from "../entities/Exam.js";
import ExamTable from "../tables/ExamTable.js";
import CourseTable from "../tables/CourseTable.js";
import User from "../entities/User.js";
import PaperTable from "../tables/PaperTable.js";
import PaperContent from "../objects/PaperContent.js";
import CourseMemberTable from "../tables/CourseMemberTable.js";

const ExamService = {
    errors: {
        TITLE_INVALID: 'title is invalid',
        EXAM_NOT_EXIST: 'exam does not exist',
        COURSE_NOT_OWNED: 'you do not own this course',
        NOT_PREPARING: 'exam is not in preparing stage',
        FORBIDDEN: 'you do not have permission',
        VALUE_INVALID: 'value is invalid',
        STAGE_INVALID: 'invalid stage transition',
        STARTS_AT_PASSED: 'exam start time has passed, please postpone it first',
        ENDS_AT_NOT_PASSED: 'exam end time has not passed yet',
        NO_PAPERS: 'exam has no papers',
        PAPER_EMPTY: 'paper has no questions',
        FULL_MISMATCH: 'total score of all papers does not match exam full score',
    },

    create: async function (courseId, ownerId, title, full, startsAt, endsAt, duration) {
        if (!Exam.patterns.TITLE.test(title)) {
            throw new Error(ExamService.errors.TITLE_INVALID);
        }

        if (full < 0 || duration <= 0 || startsAt >= endsAt) {
            throw new Error(ExamService.errors.VALUE_INVALID);
        }

        const course = await CourseTable.getCourseById(courseId);

        if (!course) {
            throw new Error(ExamService.errors.EXAM_NOT_EXIST);
        }

        if (course.owner !== ownerId) {
            throw new Error(ExamService.errors.COURSE_NOT_OWNED);
        }

        const exam = Exam.create(courseId, title, full, startsAt, endsAt, duration);

        return await ExamTable.createExam(exam);
    },

    list: async function (courseId, visitor) {
        const course = await CourseTable.getCourseById(courseId);

        if (!course) {
            return [];
        }

        if (!await ExamService.hasPermission(course, visitor)) {
            return [];
        }

        return await ExamTable.listExamsByCourseId(courseId);
    },

    info: async function (examId, visitor) {
        if (!examId.isValid()) {
            return null;
        }

        const exam = await ExamTable.getExamById(examId.raw());

        if (!exam) {
            return null;
        }

        const course = await CourseTable.getCourseById(exam.courseId);

        if (!course) {
            return null;
        }

        if (await ExamService.hasPermission(course, visitor)) {
            return exam;
        }

        return null;
    },

    update: async function (examId, visitor, updates) {
        if (!examId.isValid()) {
            throw new Error(ExamService.errors.EXAM_NOT_EXIST);
        }

        const exam = await ExamTable.getExamById(examId.raw());

        if (!exam) {
            throw new Error(ExamService.errors.EXAM_NOT_EXIST);
        }

        if (exam.stage !== Exam.Stage.PREPARING) {
            throw new Error(ExamService.errors.NOT_PREPARING);
        }

        const course = await CourseTable.getCourseById(exam.courseId);

        if (!course || course.owner !== visitor.id) {
            throw new Error(ExamService.errors.FORBIDDEN);
        }

        if (updates.title !== undefined) {
            if (!Exam.patterns.TITLE.test(updates.title)) {
                throw new Error(ExamService.errors.TITLE_INVALID);
            }
            exam.title = updates.title;
        }

        if (updates.full !== undefined) {
            if (updates.full < 0) {
                throw new Error(ExamService.errors.VALUE_INVALID);
            }
            exam.full = updates.full;
        }

        if (updates.startsAt !== undefined) {
            exam.startsAt = updates.startsAt;
        }

        if (updates.endsAt !== undefined) {
            exam.endsAt = updates.endsAt;
        }

        if (updates.duration !== undefined) {
            if (updates.duration <= 0) {
                throw new Error(ExamService.errors.VALUE_INVALID);
            }
            exam.duration = updates.duration;
        }

        if (exam.startsAt >= exam.endsAt) {
            throw new Error(ExamService.errors.VALUE_INVALID);
        }

        return await ExamTable.updateExam(exam);
    },

    drop: async function (examId, visitor) {
        if (!examId.isValid()) {
            throw new Error(ExamService.errors.EXAM_NOT_EXIST);
        }

        const exam = await ExamTable.getExamById(examId.raw());

        if (!exam) {
            throw new Error(ExamService.errors.EXAM_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(exam.courseId);

        if (!course || course.owner !== visitor.id) {
            throw new Error(ExamService.errors.FORBIDDEN);
        }

        return await ExamTable.dropExam(examId.raw());
    },

    changeStage: async function (examId, visitor, targetStage) {
        if (!examId.isValid()) {
            throw new Error(ExamService.errors.EXAM_NOT_EXIST);
        }

        const exam = await ExamTable.getExamById(examId.raw());

        if (!exam) {
            throw new Error(ExamService.errors.EXAM_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(exam.courseId);

        if (!course || course.owner !== visitor.id) {
            throw new Error(ExamService.errors.FORBIDDEN);
        }

        const now = new Date();

        const transitions = {
            [Exam.Stage.PREPARING]: [Exam.Stage.OPENING],
            [Exam.Stage.OPENING]: [Exam.Stage.GRADING],
            [Exam.Stage.GRADING]: [Exam.Stage.ARCHIVED],
        };

        const validTargets = transitions[exam.stage];

        if (!validTargets || !validTargets.includes(targetStage)) {
            throw new Error(ExamService.errors.STAGE_INVALID);
        }

        if (targetStage === Exam.Stage.OPENING) {
            // 要开放考试，当前时间须在开始时间之前，否则让前端延后开始时间再试
            if (now >= exam.startsAt) {
                throw new Error(ExamService.errors.STARTS_AT_PASSED);
            }

            // 至少需要一份试卷
            const papers = await PaperTable.listPapersByExamId(examId.raw());
            if (papers.length === 0) {
                throw new Error(ExamService.errors.NO_PAPERS);
            }

            // 每份试卷至少有一个题目，且各试卷满分之和须等于考试满分
            const paperInfos = [];
            for (const paper of papers) {
                if (!paper.questions || paper.questions.length === 0) {
                    const err = new Error(ExamService.errors.PAPER_EMPTY);
                    err.paperId = paper.id.toDisplay();
                    throw err;
                }

                const content = PaperContent.from(paper.title, paper.questions, paper.answers);
                paperInfos.push({ paperId: paper.id.toDisplay(), full: content.getFull() });
            }

            const totalFull = paperInfos.reduce((sum, p) => sum + p.full, 0);
            if (totalFull !== exam.full) {
                const err = new Error(ExamService.errors.FULL_MISMATCH);
                err.papers = paperInfos;
                throw err;
            }
        }

        if (targetStage === Exam.Stage.GRADING) {
            // 要进入阅卷，当前时间须已超过结束时间，否则还在考试中不应切换
            if (now < exam.endsAt) {
                throw new Error(ExamService.errors.ENDS_AT_NOT_PASSED);
            }
        }

        // TODO 补充 grading → archived 的条件

        exam.stage = targetStage;

        return await ExamTable.updateExam(exam);

        // TODO 后续行为：状态变更后的副作用（如 opening 时通知学生、archived 时清理等）
    },

    hasPermission: async function (course, visitor) {
        if (visitor.role === User.Role.ADMIN) {
            return true;
        } else if (visitor.role === User.Role.TEACHER) {
            return course.owner === visitor.id;
        } else if (visitor.role === User.Role.STUDENT) {
            return await CourseMemberTable.isMember(course.id.raw(), visitor.id);
        }

        return false;
    },
};

export default ExamService;
