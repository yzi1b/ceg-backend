import { randomBytes } from 'crypto';

export default class InviteCode {
    static DEFAULT_DURATION = 7 * 24 * 3600 * 1000;

    constructor(code, expiresAt) {
        this.code = code;
        this.expiresAt = expiresAt;
    }

    check(input) {
        if (Date.now() >= this.expiresAt) {
            return false;
        }

        if (input !== this.code) {
            return false;
        }

        return true;
    }

    static create(expiresAt) {
        if (!expiresAt || expiresAt.getTime() <= Date.now()) {
            expiresAt = new Date(Date.now() + InviteCode.DEFAULT_DURATION);
        }

        const code = randomBytes(8).toString('hex');
        return new InviteCode(code, expiresAt);
    }
}