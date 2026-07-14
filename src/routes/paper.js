import {Router} from 'express';
import {authenticate, authorize, jwtToUser} from "../auth.js";
import DisplayableId from "../objects/DisplayableId.js";
import PaperService from "../services/PaperService.js";
import User from "../entities/User.js";

const router = Router();

router.post('/create', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.body) {
        return res.status(400).send({});
    }

    const { examId, title } = req.body;

    if (!examId || !title) {
        return res.status(400).send({});
    }

    const eId = DisplayableId.fromDisplay(examId);
    if (!eId.isValid()) {
        return res.status(400).send({});
    }

    try {
        const paper = await PaperService.create(eId.raw(), req.user, title);
        return res.status(200).send({ code: 0, id: paper.id.toDisplay() });
    } catch (e) {
        if (e.message === PaperService.errors.NOT_PREPARING) {
            return res.status(409).send({});
        } else if (e.message === PaperService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === PaperService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else if (e.message === PaperService.errors.QUESTIONS_INVALID) {
            return res.status(400).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.get('/list', authenticate, jwtToUser, async (req, res) => {
    if (!req.query.examId) {
        return res.status(400).send({});
    }

    const eId = DisplayableId.fromDisplay(Number.parseInt(req.query.examId));
    if (!eId.isValid()) {
        return res.status(400).send({});
    }

    try {
        const papers = await PaperService.list(eId.raw(), req.user);
        const summaries = papers.map((paper) => paper.toJsonSummary());
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
        const paper = await PaperService.info(DisplayableId.fromDisplay(id), req.user);
        if (!paper) {
            return res.status(404).send({});
        }
        return res.status(200).send({ code: 0, object: paper.toJsonDetail() });
    } catch (e) {
        return res.status(500).send({});
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
        await PaperService.drop(DisplayableId.fromDisplay(id), req.user);
        return res.status(200).send({ code: 0 });
    } catch (e) {
        if (e.message === PaperService.errors.PAPER_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === PaperService.errors.NOT_PREPARING) {
            return res.status(409).send({});
        } else if (e.message === PaperService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.post('/object', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    if (!req.body || (!req.body.questions && !req.body.answers)) {
        return res.status(400).send({});
    }

    try {
        await PaperService.saveContent(
            DisplayableId.fromDisplay(id), req.user,
            req.body.questions, req.body.answers
        );
        return res.status(204).send({});
    } catch (e) {
        if (e.message === PaperService.errors.PAPER_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === PaperService.errors.NOT_PREPARING) {
            return res.status(409).send({});
        } else if (e.message === PaperService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else if (e.message?.startsWith(PaperService.errors.QUESTIONS_INVALID)) {
            return res.status(400).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.get('/grade/start', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    try {
        const paper = await PaperService.startGrading(
            DisplayableId.fromDisplay(id).raw(), req.user
        );
        return res.status(200).send({ code: 0, object: paper.toJsonSummary() });
    } catch (e) {
        if (e.message === PaperService.errors.PAPER_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === PaperService.errors.NOT_GRADING) {
            return res.status(409).send({});
        } else if (e.message === PaperService.errors.INVALID_PAPER_STAGE) {
            return res.status(409).send({});
        } else if (e.message === PaperService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.get('/grade/tasks', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    try {
        const result = await PaperService.gradeTasks(
            DisplayableId.fromDisplay(id).raw(), req.user
        );
        return res.status(200).send({ code: 0, ...result });
    } catch (e) {
        if (e.message === PaperService.errors.PAPER_NOT_EXIST
            || e.message === PaperService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === PaperService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.get('/grade/next', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.query.id || req.query.questionIndex === undefined) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    const questionIndex = Number.parseInt(req.query.questionIndex);
    if (!Number.isInteger(id) || id <= 0
        || !Number.isInteger(questionIndex) || questionIndex < 0) {
        return res.status(400).send({});
    }

    try {
        const result = await PaperService.gradeNext(
            DisplayableId.fromDisplay(id).raw(), questionIndex, req.user
        );
        return res.status(200).send({ code: 0, ...result });
    } catch (e) {
        if (e.message === PaperService.errors.PAPER_NOT_EXIST
            || e.message === PaperService.errors.EXAM_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === PaperService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else if (e.message === PaperService.errors.INVALID_PAPER_STAGE) {
            return res.status(409).send({});
        } else if (e.message === PaperService.errors.QUESTION_NOT_SUBJECTIVE
            || e.message === PaperService.errors.QUESTIONS_INVALID) {
            return res.status(400).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.get('/grade/finish', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    try {
        const paper = await PaperService.gradeFinish(
            DisplayableId.fromDisplay(id).raw(), req.user
        );
        return res.status(200).send({ code: 0, object: paper.toJsonSummary() });
    } catch (e) {
        if (e.message === PaperService.errors.PAPER_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === PaperService.errors.INVALID_PAPER_STAGE) {
            return res.status(409).send({});
        } else if (e.message === PaperService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else if (e.message === PaperService.errors.INCOMPLETE_GRADING) {
            return res.status(200).send({ code: 1, msg: 'not all questions have been graded' });
        } else {
            return res.status(500).send({});
        }
    }
});

router.post('/grade/score', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    if (!req.query.id || !req.body || !req.body.token || typeof req.body.score !== 'number') {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    try {
        const result = await PaperService.gradeScore(
            DisplayableId.fromDisplay(id).raw(), req.user,
            req.body.token, req.body.score
        );
        return res.status(200).send({ code: 0, ...result });
    } catch (e) {
        if (e.message === PaperService.errors.PAPER_NOT_EXIST
            || e.message === PaperService.errors.EXAM_NOT_EXIST
            || e.message === PaperService.errors.SUBMISSION_NOT_FOUND) {
            return res.status(404).send({});
        } else if (e.message === PaperService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else if (e.message === PaperService.errors.INVALID_PAPER_STAGE) {
            return res.status(409).send({});
        } else if (e.message === PaperService.errors.INVALID_TOKEN
            || e.message === PaperService.errors.SCORE_EXCEEDS_MAX
            || e.message === PaperService.errors.QUESTION_NOT_SUBJECTIVE
            || e.message === PaperService.errors.QUESTIONS_INVALID) {
            return res.status(400).send({});
        } else if (e.message === PaperService.errors.TOKEN_EXPIRED) {
            return res.status(200).send({ code: 1, msg: 'grade token has expired' });
        } else if (e.message === PaperService.errors.ALREADY_GRADED) {
            return res.status(200).send({ code: 2, msg: 'this question has already been graded' });
        } else {
            return res.status(500).send({});
        }
    }
});

export default router;
