import {Router} from 'express';
import {authenticate, authorize} from "../auth.js";
import {isNullOrUndefined} from "../utils.js";
import AdminService from "../services/AdminService.js";
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

export default router;
