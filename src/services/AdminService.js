import User from "../entities/User.js";
import UserTable from "../tables/UserTable.js";
import Password from "../objects/Password.js";
import Role from "../objects/Role.js";

const AdminService = {
    errors: {
        USER_NAME_EXIST: 'user name has already existed',
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
                userName, Password.fromInput(radomPassword), Role.TEACHER,
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
    }
};

export default AdminService;