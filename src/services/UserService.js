import UserTable from "../tables/UserTable.js";
import User from "../entities/User.js";
import Password from "../objects/Password.js";

const UserService = {
    errors: {
        USER_NAME_EXIST: 'user name has already existed',
        VALUE_INVALID: 'some of the values is not valid',
        PASSWORD_NOT_STRONG: 'password is not strong enough',
        PASSWORD_IS_WRONG: 'password is wrong',
        USER_NOT_EXIST: 'user does not exist',
    },

    async register(userName, password, fullName, gender) {
        if (!User.patterns.USER_NAME.test(userName)
            || !User.patterns.PASSWORD.test(password)
            || !User.patterns.FULL_NAME.test(fullName)) {
            throw new Error(UserService.errors.VALUE_INVALID);
        }

        if (!User.patterns.STRONG_PASSWORD.test(password)) {
            throw new Error(UserService.errors.PASSWORD_NOT_STRONG);
        }

        let user;

        try {
            user = await UserTable.newUser(User.create(
                userName, Password.fromInput(password), User.Role.STUDENT,
                fullName, gender
            ));
        } catch (error) {
            if (error.message === UserTable.errors.USER_NAME_EXIST) {
                throw new Error(UserService.errors.USER_NAME_EXIST);
            } else {
                throw error;
            }
        }

        return user;
    },

    async changePassword(jwt, oldPassword, newPassword) {
        if (!User.patterns.PASSWORD.test(oldPassword)
            || !User.patterns.PASSWORD.test(newPassword)) {
            throw new Error(UserService.errors.VALUE_INVALID);
        }

        const user = await UserTable.findByAccountId(jwt.getAccountId());

        if (!user) {
            throw new Error(UserService.errors.USER_NOT_EXIST);
        }

        if (!user.password.check(oldPassword)) {
            throw new Error(UserService.errors.PASSWORD_IS_WRONG);
        }

        if (!User.patterns.STRONG_PASSWORD.test(newPassword)) {
            throw new Error(UserService.errors.PASSWORD_NOT_STRONG);
        }

        user.password = Password.fromInput(newPassword);

        return await UserTable.updateUser(user);
    }
};

export default UserService;
