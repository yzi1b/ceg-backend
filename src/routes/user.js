import {Router} from 'express';
import AuthService from "../services/AuthService.js";
import UserService from "../services/UserService.js";
import {authenticate} from "../auth.js";

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

router.post('/changePassword', authenticate, async (req, res) => {
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

export default router;
