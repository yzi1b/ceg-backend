import express from 'express';
import AuthService from "./services/AuthService.js";
import UserService from "./services/UserService.js";
import {authenticate, authorize, jwtToUser} from "./auth.js";
import Jwt from "./objects/Jwt.js";
import AdminService from "./services/AdminService.js";
import {isNullOrUndefined} from "./utils.js";
import User from "./entities/User.js";
import {stringUsable} from "string-usable";
import CourseService from "./services/CourseService.js";
import Course from "./entities/Course.js";
import UserTable from "./tables/UserTable.js";
import DisplayableId from "./objects/DisplayableId.js";


export default class Server {
    static port = process.env.WEB_PORT || 8088;

    constructor() {
        this.app = express();

        this.app.use(express.json());

        this.app.post('/user/login', async (req, res) => {
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

        this.app.post('/user/register', async (req, res) => {
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

        this.app.post('/user/refresh', authenticate, async (req, res) => {
            return res.status(200).send({code: 0, token: AuthService.refresh(req.jwt)});
        });

        this.app.post('/user/changePassword', authenticate, async (req, res) => {
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

        this.app.post('/course/create', authenticate, authorize(User.Role.TEACHER), async (req, res) => {
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

        this.app.get('/course/list', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
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

        this.app.get('/course/object', authenticate, jwtToUser, async (req, res) => {
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

        this.app.delete('/course/object', authenticate, authorize(User.Role.TEACHER), jwtToUser, async (req, res) => {
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

        this.app.post('/admin/teacher/create', authenticate, authorize(User.Role.ADMIN), async (req, res) => {
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
    }

    start() {
        this.server = this.app.listen(Server.port, () => {
            console.info(`express server is on：http://localhost:${Server.port}`);
        });
    }
}