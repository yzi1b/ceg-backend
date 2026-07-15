import User from "../entities/User.js";
import UserTable from "../tables/UserTable.js";
import CourseTable from "../tables/CourseTable.js";
import Password from "../objects/Password.js";
import db from "../db.js";

const AdminService = {
    errors: {
        USER_NAME_EXIST: 'user name has already existed',
        USER_NOT_EXIST: 'user does not exist',
        CANNOT_DELETE_SELF: 'cannot delete yourself',
        NOT_TEACHER: 'user is not a teacher',
    },

    createTeacher: async function(userName, fullName, gender) {
        if (!User.patterns.USER_NAME.test(userName)
            || !User.patterns.FULL_NAME.test(fullName)) {
            throw new Error(AdminService.errors.VALUE_INVALID);
        }

        let user;

        const radomPassword = Password.random();

        try {
            user = await UserTable.newUser(User.create(
                userName, Password.fromInput(radomPassword), User.Role.TEACHER,
                fullName, gender
            ));
        } catch (error) {
            if (error.message === UserTable.errors.USER_NAME_EXIST) {
                throw new Error(AdminService.errors.USER_NAME_EXIST);
            } else {
                throw error;
            }
        }

        user.passwordRaw = radomPassword;

        return user;
    },

    deleteTeacher: async function(accountId, adminId) {
        if (accountId === adminId) {
            throw new Error(AdminService.errors.CANNOT_DELETE_SELF);
        }

        const user = await UserTable.findByAccountId(accountId);
        if (!user) {
            throw new Error(AdminService.errors.USER_NOT_EXIST);
        }
        if (user.role !== User.Role.TEACHER) {
            throw new Error(AdminService.errors.NOT_TEACHER);
        }

        const courses = await db('courses').where('owner', user.id);
        for (const course of courses) {
            await CourseTable.dropCourse(course.id);
        }

        await UserTable.dropUser(user.id);
    },

    resetPassword: async function(accountId) {
        const user = await UserTable.findByAccountId(accountId);
        if (!user) {
            throw new Error(AdminService.errors.USER_NOT_EXIST);
        }

        const newPassword = Password.random();
        user.password = Password.fromInput(newPassword);

        await UserTable.updateUser(user);

        user.passwordRaw = newPassword;

        return user;
    }
};

export default AdminService;