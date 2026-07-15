import {Router} from 'express';
import AuthService from "../services/AuthService.js";
import UserService from "../services/UserService.js";
import {authenticate, jwtToUser} from "../auth.js";
import UserTable from "../tables/UserTable.js";
import CourseTable from "../tables/CourseTable.js";
import CourseMemberTable from "../tables/CourseMemberTable.js";
import User from "../entities/User.js";

const router = Router();

router.post('/login', async (req, res) => {
    if (!req.body || !req.body.password
        || (!req.body.accountId && !req.body.userName)
        || (req.body.accountId && req.body.userName)) {
        return res.status(400).send({});
    }

    let token;
    try {
        if (req.body.accountId) {
            token = await AuthService.loginByAccountId(
                req.body.accountId, req.body.password
            );
        } else {
            token = await AuthService.loginByUserName(
                req.body.userName, req.body.password
            )
        }
    } catch (e) {
        if (e.message === AuthService.errors.ACCOUNT_OR_PASSWORD_WRONG) {
            return res.status(200).send({code: 1, msg: 'account or password is wrong'});
        } else {
            return res.status(500).send({});
        }
    }

    return res.status(200).send({code: 0, token});
});

router.post('/register', async (req, res) => {
    if (!req.body) {
        return res.status(400).send({});
    }
    const body = req.body;

    if (!body.userName || !body.password || !body.fullName || !Object.hasOwn(body, 'gender')) {
        return res.status(400).send({});
    }

    let user;
    try {
        user = await UserService.register(body.userName, body.password,
            body.fullName, body.gender);
    } catch (e) {
        if (e.message === UserService.errors.VALUE_INVALID) {
            return res.status(400).send({});
        } else if (e.message === UserService.errors.PASSWORD_NOT_STRONG) {
            return res.status(200).send({
                code: 2,
                msg: 'password is not strong enough',
            });
        } else if (e.message === UserService.errors.USER_NAME_EXIST) {
            return res.status(200).send({
                code: 1,
                msg: 'user name already exists',
            });
        } else {
            return res.status(500).send({});
        }
    }

    return res.status(200).send({
        code: 0, accountId: user.accountId, userName: user.userName,
    });
});

router.post('/refresh', authenticate, async (req, res) => {
    return res.status(200).send({code: 0, token: AuthService.refresh(req.jwt)});
});

router.post('/password', authenticate, async (req, res) => {
    if (!req.body) {
        return res.status(400).send({});
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).send({});
    }

    try {
        await UserService.changePassword(req.jwt, oldPassword, newPassword);
    } catch (e) {
        if (e.message === UserService.errors.VALUE_INVALID
            || e.message === UserService.errors.PASSWORD_NOT_STRONG) {
            return res.status(400).send({});
        } else if (e.message === UserService.errors.PASSWORD_IS_WRONG) {
            return res.status(200).send({
                code: 1,
                msg: 'password is wrong',
            });
        } else if (e.message === UserService.errors.USER_NOT_EXIST) {
            return res.status(200).send({
                code: 2,
                msg: 'user does not exist',
            });
        } else {
            return res.status(500).send({});
        }
    }

    return res.status(200).send({code: 0});
});

router.get('/object', authenticate, jwtToUser, async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const accountId = Number.parseInt(req.query.id);
    if (!Number.isInteger(accountId) || accountId < 10000000 || accountId > 99999999) {
        return res.status(400).send({});
    }

    try {
        const target = await UserTable.findByAccountId(accountId);
        if (!target) {
            return res.status(404).send({});
        }

        const visitor = req.user;

        if (visitor.role === User.Role.ADMIN || visitor.id === target.id) {
            return res.status(200).send({ code: 0, object: target.toJson() });
        }

        if (visitor.role === User.Role.TEACHER) {
            const courses = await CourseTable.listCoursesByOwner(visitor.id);
            for (const course of courses) {
                if (await CourseMemberTable.isMember(course.id.raw(), target.id)) {
                    return res.status(200).send({ code: 0, object: target.toJson() });
                }
            }
        }

        return res.status(403).send({});
    } catch (e) {
        return res.status(500).send({});
    }
});

router.delete('/object', authenticate, jwtToUser, async (req, res) => {
    try {
        await UserService.deleteSelf(req.user);
        return res.status(200).send({ code: 0 });
    } catch (e) {
        if (e.message === UserService.errors.FORBIDDEN) {
            return res.status(403).send({});
        } else {
            return res.status(500).send({});
        }
    }
});

router.post('/object', authenticate, jwtToUser, async (req, res) => {
    if (!req.query.id || !req.body) {
        return res.status(400).send({});
    }

    const accountId = Number.parseInt(req.query.id);
    if (!Number.isInteger(accountId) || accountId < 10000000 || accountId > 99999999) {
        return res.status(400).send({});
    }

    const { fullName, gender } = req.body;
    if (fullName === undefined && gender === undefined) {
        return res.status(400).send({});
    }

    try {
        const target = await UserTable.findByAccountId(accountId);
        if (!target) {
            return res.status(404).send({});
        }

        const visitor = req.user;

        if (visitor.role !== User.Role.ADMIN && visitor.id !== target.id) {
            return res.status(403).send({});
        }

        if (fullName !== undefined) {
            if (!User.patterns.FULL_NAME.test(fullName)) {
                return res.status(400).send({});
            }
            target.fullName = fullName;
        }

        if (gender !== undefined) {
            if (typeof gender !== 'boolean') {
                return res.status(400).send({});
            }
            target.gender = gender;
        }

        const updated = await UserTable.updateUser(target);
        return res.status(200).send({ code: 0, object: updated.toJson() });
    } catch (e) {
        return res.status(500).send({});
    }
});

export default router;
