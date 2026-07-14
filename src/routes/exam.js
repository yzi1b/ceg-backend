import {Router} from 'express';
import {authenticate, authorize, jwtToUser} from "../auth.js";
import {stringUsable} from "string-usable";
import DisplayableId from "../objects/DisplayableId.js";
import ExamService from "../services/ExamService.js";
import Exam from "../entities/Exam.js";
import User from "../entities/User.js";
import Submission from "../entities/Submission.js";
import SubmissionTable from "../tables/SubmissionTable.js";

const router = Router();

router.post('/create', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.body) {
        return res.status(400).send({});
    }

    const { courseId, title, full, startsAt, endsAt, duration } = req.body;

    if (!courseId || !stringUsable(title) || full === undefined
        || startsAt === undefined || endsAt === undefined || duration === undefined || duration < 1) {
        return res.status(400).send({});
    }

    const cId = DisplayableId.fromDisplay(courseId);
    if (!cId.isValid()) {
        return res.status(400).send({});
    }

    try {
        const exam = await ExamService.create(
            cId.raw(), req.user.id, title, full,
            new Date(startsAt), new Date(endsAt), duration
        );
        return res.status(200).send({ code: 0, id: exam.id.toDisplay() });
    } catch (e) {
        if (e.message === ExamService.errors.TITLE_INVALID
            || e.message === ExamService.errors.VALUE_INVALID) {
            return res.status(400).send({});
        } else if (e.message === ExamService.errors.COURSE_NOT_OWNED) {
            return res.status(403).send({});
        } else if (e.message === ExamService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.get('/list', authenticate, jwtToUser, async (req, res) => {
    if (!req.query.courseId) {
        return res.status(400).send({});
    }

    const cId = DisplayableId.fromDisplay(Number.parseInt(req.query.courseId));
    if (!cId.isValid()) {
        return res.status(400).send({});
    }

    try {
        const exams = await ExamService.list(cId.raw(), req.user);
        const summaries = exams.map((exam) => exam.toJsonSummary());
        return res.status(200).send({
            code: 0, objects: summaries, count: summaries.length,
        });
    } catch (e) {
        return res.status(500).send({});
    }
});

router.get('/object', authenticate, jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    try {
        const exam = await ExamService.info(DisplayableId.fromDisplay(id), req.user);
        if (!exam) {
            return res.status(404).send({});
        }

        const summary = exam.toJsonSummary();

        if (req.user.role === User.Role.STUDENT) {
            const submission = await SubmissionTable.getSubmission(exam.id.raw(), req.user.id);
            summary.score = submission && exam.stage === Exam.Stage.ARCHIVED
                ? submission.total : -1;
            summary.status = submission
                ? (submission.submit ? Submission.Status.SUBMITTED : Submission.Status.IN_PROGRESS)
                : Submission.Status.NOT_TAKEN;
        }

        return res.status(200).send({ code: 0, object: summary });
    } catch (e) {
        return res.status(500).send({});
    }
});

router.post('/object', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.body || !req.body.id) {
        return res.status(400).send({});
    }

    const id = DisplayableId.fromDisplay(req.body.id);
    if (!id.isValid()) {
        return res.status(400).send({});
    }

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.full !== undefined) updates.full = req.body.full;
    if (req.body.startsAt !== undefined) updates.startsAt = new Date(req.body.startsAt);
    if (req.body.endsAt !== undefined) updates.endsAt = new Date(req.body.endsAt);
    if (req.body.duration !== undefined) updates.duration = req.body.duration;

    if (Object.keys(updates).length === 0) {
        return res.status(400).send({});
    }

    try {
        const exam = await ExamService.update(id, req.user, updates);
        return res.status(200).send({ code: 0, object: exam.toJsonSummary() });
    } catch (e) {
        if (e.message === ExamService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === ExamService.errors.NOT_PREPARING) {
            return res.status(409).send({});
        } else if (e.message === ExamService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else if (e.message === ExamService.errors.TITLE_INVALID
            || e.message === ExamService.errors.VALUE_INVALID) {
            return res.status(400).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.delete('/object', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    try {
        await ExamService.drop(DisplayableId.fromDisplay(id), req.user);
        return res.status(200).send({ code: 0 });
    } catch (e) {
        if (e.message === ExamService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === ExamService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.get('/take', authenticate, authorize(User.Role.STUDENT), jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    try {
        const result = await ExamService.take(
            DisplayableId.fromDisplay(id).raw(), req.user
        );

        const body = {
            exam: result.exam.toJsonSummary(),
            paper: {
                id: result.paper.id.toDisplay(),
                title: result.paper.title,
                questions: result.paper.questions,
            },
            submittedAt: result.submission.submittedAt instanceof Date
                ? result.submission.submittedAt.getTime()
                : result.submission.submittedAt,
            submit: result.submission.submit,
        };

        if (!result.isNew) {
            body.answers = result.submission.answers;
        }

        return res.status(200).send(body);
    } catch (e) {
        if (e.message === ExamService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === ExamService.errors.NOT_OPENING) {
            return res.status(409).send({});
        } else if (e.message === ExamService.errors.NOT_IN_TIME_WINDOW) {
            return res.status(200).send({ code: 1, msg: 'exam is not in the time window' });
        } else if (e.message === ExamService.errors.TIME_EXPIRED) {
            return res.status(200).send({ code: 2, msg: 'exam duration has expired' });
        } else if (e.message === ExamService.errors.ALREADY_SUBMITTED) {
            return res.status(200).send({ code: 4, msg: 'you have already submitted' });
        } else {
            return res.status(500).send({});
        }
    }
});

router.post('/submit', authenticate, authorize(User.Role.STUDENT), jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    if (!req.body || !Array.isArray(req.body.answers) || typeof req.body.submit !== 'boolean') {
        return res.status(400).send({});
    }

    try {
        await ExamService.submit(
            DisplayableId.fromDisplay(id).raw(), req.user,
            req.body.answers, req.body.submit
        );

        return res.status(200).send({ code: 0 });
    } catch (e) {
        if (e.message === ExamService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === ExamService.errors.NOT_OPENING) {
            return res.status(409).send({});
        } else if (e.message === ExamService.errors.NOT_IN_TIME_WINDOW) {
            return res.status(200).send({ code: 1, msg: 'exam is not in the time window' });
        } else if (e.message === ExamService.errors.TIME_EXPIRED) {
            return res.status(200).send({ code: 2, msg: 'exam duration has expired' });
        } else if (e.message === ExamService.errors.SUBMISSION_NOT_FOUND) {
            return res.status(200).send({ code: 3, msg: 'submission not found, please take the exam first' });
        } else if (e.message === ExamService.errors.ALREADY_SUBMITTED) {
            return res.status(200).send({ code: 4, msg: 'you have already submitted' });
        } else {
            return res.status(500).send({});
        }
    }
});

router.post('/stage', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.body || !req.body.id || !req.body.stage) {
        return res.status(400).send({});
    }

    const id = DisplayableId.fromDisplay(req.body.id);
    if (!id.isValid()) {
        return res.status(400).send({});
    }

    try {
        const exam = await ExamService.changeStage(id, req.user, req.body.stage);
        return res.status(200).send({ code: 0, object: exam.toJsonSummary() });
    } catch (e) {
        if (e.message === ExamService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === ExamService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else if (e.message === ExamService.errors.STAGE_INVALID) {
            return res.status(200).send({ code: 4, msg: e.message });
        } else if (e.message === ExamService.errors.STARTS_AT_PASSED) {
            return res.status(200).send({ code: 5, msg: e.message });
        } else if (e.message === ExamService.errors.ENDS_AT_NOT_PASSED) {
            return res.status(200).send({ code: 6, msg: e.message });
        } else if (e.message === ExamService.errors.NO_PAPERS) {
            return res.status(200).send({ code: 1, msg: e.message });
        } else if (e.message === ExamService.errors.PAPER_EMPTY) {
            return res.status(200).send({ code: 2, msg: e.message, paperId: e.paperId });
        } else if (e.message === ExamService.errors.FULL_MISMATCH) {
            return res.status(200).send({ code: 3, msg: e.message, papers: e.papers });
        } else if (e.message === ExamService.errors.PAPERS_NOT_ARCHIVED) {
            return res.status(200).send({ code: 7, msg: e.message });
        } else {
            return res.status(500).send({});
        }
    }
});

export default router;
