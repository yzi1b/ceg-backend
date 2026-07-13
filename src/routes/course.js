import {Router} from 'express';
import {authenticate, authorize, jwtToUser} from "../auth.js";
import {stringUsable} from "string-usable";
import UserTable from "../tables/UserTable.js";
import CourseService from "../services/CourseService.js";
import DisplayableId from "../objects/DisplayableId.js";
import User from "../entities/User.js";

const router = Router();

router.post('/create', authenticate, authorize(User.Role.TEACHER), async (req, res) => {
    if (!req.body) {
        return res.status(400).send({});
    }

    const { title, codeDays } = req.body;

    if (!stringUsable(title) || codeDays < 0) {
        return res.status(400).send({});
    }

    let user;

    try {
        user = await UserTable.findByAccountId(req.jwt.getAccountId());
    } catch (e) {
        return res.status(400).send({});
    }

    if (!user) {
        return res.status(401).send({});
    }

    let course;

    try {
        course = await CourseService.create(user.id, title, codeDays);
    } catch (e) {
        if (e.message === CourseService.errors.TITLE_INVALID) {
            return res.status(400).send({});
        } else {
            return res.status(500).send({});
        }
    }

    return res.status(200).send({code: 0, id: course.id.toDisplay()});
});

router.get('/list', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
    let courses;

    try {
        courses = await CourseService.list(req.user.id)
    } catch (e) {
        return res.status(500).send({});
    }

    const courseSummaries = courses.map((course) => course.toJsonSummary());

    return res.status(200).send({
        code: 0, objects: courseSummaries,
        count: courseSummaries.length,
    });
});

router.get('/object', authenticate, jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    let course;
    try {
        course = await CourseService.info(DisplayableId.fromDisplay(id), req.user);
    } catch (e) {
        return res.status(500).send({});
    }

    if (!course) {
        return res.status(404).send({});
    }

    return res.status(200).send({code: 0, object: course.toJsonSummary()});
});

router.post('/code', authenticate, authorize(User.Role.TEACHER, User.Role.ADMIN), jwtToUser, async (req, res) => {
    if (!req.body || !req.body.courseId || req.body.codeDays === undefined) {
        return res.status(400).send({});
    }

    const courseId = DisplayableId.fromDisplay(req.body.courseId);
    if (!courseId.isValid()) {
        return res.status(400).send({});
    }

    const codeDays = Number.parseInt(req.body.codeDays);
    if (!Number.isInteger(codeDays) || codeDays < 0) {
        return res.status(400).send({});
    }

    try {
        const course = await CourseService.code(courseId, req.user, codeDays);
        return res.status(200).send({code: 0, object: course.toJsonSummary()});
    } catch (e) {
        if (e.message === CourseService.errors.COURSE_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === CourseService.errors.COURSE_NOT_OWNED) {
            return res.status(403).send({});
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
        await CourseService.drop(DisplayableId.fromDisplay(id), req.user.id);
    } catch (e) {
        if (e.message === CourseService.errors.COURSE_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === CourseService.errors.COURSE_NOT_OWNED) {
            return res.status(403).send({});
        } else {
            return res.status(500).send({});
        }
    }

    return res.status(200).send({code: 0});
});

router.get('/join', authenticate, authorize(User.Role.STUDENT), jwtToUser, async (req, res) => {
    if (!req.query.code) {
        return res.status(400).send({});
    }

    try {
        const course = await CourseService.join(req.query.code, req.user);
        return res.status(200).send({code: 0, object: course.toJsonSummary()});
    } catch (e) {
        if (e.message === CourseService.errors.INVITE_CODE_INVALID) {
            return res.status(200).send({code: 1, msg: e.message});
        } else if (e.message === CourseService.errors.ALREADY_MEMBER) {
            return res.status(200).send({code: 2, msg: e.message});
        } else {
            return res.status(500).send({});
        }
    }
});

router.delete('/quit', authenticate, authorize(User.Role.STUDENT), jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    try {
        await CourseService.quit(DisplayableId.fromDisplay(id), req.user);
        return res.status(200).send({code: 0});
    } catch (e) {
        if (e.message === CourseService.errors.COURSE_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === CourseService.errors.NOT_MEMBER) {
            return res.status(200).send({code: 1, msg: e.message});
        } else {
            return res.status(500).send({});
        }
    }
});

router.delete('/student', authenticate, authorize(User.Role.TEACHER, User.Role.ADMIN), jwtToUser, async (req, res) => {
    if (!req.query.id || !req.query.studentId) {
        return res.status(400).send({});
    }

    const id = Number.parseInt(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({});
    }

    const studentId = Number.parseInt(req.query.studentId);
    if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(400).send({});
    }

    try {
        await CourseService.kick(DisplayableId.fromDisplay(id), req.user, studentId);
        return res.status(200).send({code: 0});
    } catch (e) {
        if (e.message === CourseService.errors.COURSE_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === CourseService.errors.COURSE_NOT_OWNED) {
            return res.status(403).send({});
        } else if (e.message === CourseService.errors.KICK_SELF) {
            return res.status(200).send({code: 1, msg: e.message});
        } else if (e.message === CourseService.errors.STUDENT_NOT_IN_COURSE) {
            return res.status(200).send({code: 2, msg: e.message});
        } else {
            return res.status(500).send({});
        }
    }
});

export default router;
