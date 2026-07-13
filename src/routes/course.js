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

export default router;
