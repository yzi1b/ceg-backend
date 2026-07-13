import Password from "../objects/Password.js";
import {getRandomInt} from "../utils.js";

const ACCOUNT_ID_MIN = 10000000;
const ACCOUNT_ID_MAX = 99999999;

export default class User {
    static patterns = {
        USER_NAME: /^[A-Za-z][A-Za-z0-9_]{3,15}$/,
        PASSWORD: /^[ -~]{6,16}$/,
        STRONG_PASSWORD: /^((?=.*[A-Za-z])(?=.*[0-9])|(?=.*[A-Za-z])(?=.*[^A-Za-z0-9])|(?=.*[0-9])(?=.*[^A-Za-z0-9]))[ -~]{6,16}$/,
        FULL_NAME: /^(?!.* {2})\S[\S ]{0,62}\S$/,
    };

    constructor(id, accountId, userName, password, role, fullName, gender, createdAt, updatedAt) {
        this.id = id;
        this.accountId = accountId;
        this.userName = userName;
        this.password = password;
        this.role = role;
        this.fullName = fullName;
        this.gender = gender;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromRecord(raw) {
        return new User(raw.id, raw.account_id, raw.user_name,
            new Password(raw.password_hash, raw.password_salt),
            raw.role, raw.full_name, raw.gender,
            raw.created_at, raw.updated_at);
    }

    toRecord() {
        return {
            id: this.id,
            account_id: this.accountId,
            user_name: this.userName,
            password_hash: this.password.hash,
            password_salt: this.password.salt,
            role: this.role,
            full_name: this.fullName,
            gender: this.gender,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        }
    }

    static create(userName, password, role, fullName, gender) {
        return new User(-1,
            getRandomInt(ACCOUNT_ID_MIN, ACCOUNT_ID_MAX + 1),
            userName, password, role, fullName, gender, 0, 0);
    }
}