import Jwt from "../objects/Jwt.js";
import UserTable from "../tables/UserTable.js";

const AuthService = {
    errors: {
        VALUE_INVALID: 'some of the values is not valid',
        ACCOUNT_OR_PASSWORD_WRONG:
            'account or password is wrong',
    },

    async loginByAccountId(accountId, password) {
        const user = await UserTable.findByAccountId(accountId);
        return login(user, password);
    },

    async loginByUserName(userName, password) {
        const user = await UserTable.findByUserName(userName);
        return login(user, password);
    },

    refresh(jwt) {
        return jwt.refresh();
    }
};

function login(user, password) {
    if (!user || !user.password.check(password)) {
        throw new Error(AuthService.errors.ACCOUNT_OR_PASSWORD_WRONG);
    }

    return Jwt.generate(user).toToken();
}

export default AuthService;
