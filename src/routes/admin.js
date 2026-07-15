import {Router} from 'express';
import {authenticate, authorize} from "../auth.js";
import {isNullOrUndefined} from "../utils.js";
import AdminService from "../services/AdminService.js";
import UserTable from "../tables/UserTable.js";
import User from "../entities/User.js";

const router = Router();

router.post('/teacher/create', authenticate, authorize(User.Role.ADMIN), async (req, res) => {
    if (!req.body) {
        return res.status(400).send({});
    }

    const { userName, fullName, gender } = req.body;

    if (!userName || !fullName || isNullOrUndefined(gender)
        || !User.patterns.USER_NAME.test(userName)
        || !User.patterns.FULL_NAME.test(fullName)) {
        return res.status(400).send({});
    }

    let user;
    try {
        user = await AdminService.createTeacher(userName, fullName, gender);
    } catch (e) {
        if (e.message === AdminService.errors.VALUE_INVALID) {
            return res.status(400).send({});
        } else if (e.message === AdminService.errors.USER_NAME_EXIST) {
            return res.status(200).send({
                code: 1,
                msg: 'user name already exists',
            });
        } else {
            return res.status(500).send({});
        }
    }

    return res.status(200).send({
        code: 0, accountId: user.accountId, userName: user.userName, password: user.passwordRaw,
    });
});

router.get('/user/list', authenticate, authorize(User.Role.ADMIN), async (req, res) => {
    try {
        const users = await UserTable.listAll();
        const objects = users.map(u => u.toJson());
        return res.status(200).send({ code: 0, objects, count: objects.length });
    } catch (e) {
        return res.status(500).send({});
    }
});

router.delete('/user', authenticate, authorize(User.Role.ADMIN), async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const accountId = Number.parseInt(req.query.id);
    if (!Number.isInteger(accountId) || accountId < 10000000 || accountId > 99999999) {
        return res.status(400).send({});
    }

    try {
        await AdminService.deleteUser(accountId, req.jwt.getAccountId());
        return res.status(200).send({ code: 0 });
    } catch (e) {
        if (e.message === AdminService.errors.USER_NOT_EXIST) {
            return res.status(404).send({});
        } else if (e.message === AdminService.errors.NOT_TEACHER) {
            return res.status(400).send({});
        } else if (e.message === AdminService.errors.CANNOT_DELETE_SELF) {
            return res.status(200).send({ code: 1, msg: 'cannot delete yourself' });
        } else {
            return res.status(500).send({});
        }
    }
});

router.get('/user/password', authenticate, authorize(User.Role.ADMIN), async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send({});
    }

    const accountId = Number.parseInt(req.query.id);
    if (!Number.isInteger(accountId) || accountId < 10000000 || accountId > 99999999) {
        return res.status(400).send({});
    }

    try {
        const user = await AdminService.resetPassword(accountId);
        return res.status(200).send({
            code: 0,
            accountId: user.accountId,
            userName: user.userName,
            password: user.passwordRaw,
        });
    } catch (e) {
        if (e.message === AdminService.errors.USER_NOT_EXIST) {
            return res.status(404).send({});
        }
        return res.status(500).send({});
    }
});

export default router;
