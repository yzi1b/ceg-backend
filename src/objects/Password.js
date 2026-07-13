
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

export default class Password {
    constructor(hash, salt) {
        this.hash = hash;
        this.salt = salt;
    }

    check(input) {
        const inputHash = scryptSync(input, this.salt, KEY_LENGTH).toString('hex');
        const a = Buffer.from(this.hash, 'hex');
        const b = Buffer.from(inputHash, 'hex');
        if (a.length !== b.length) return false;
        return timingSafeEqual(a, b);
    }

    static random() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
        let sb = [];
        const bytes = randomBytes(16);
        for (let i = 0; i < 16; i++) {
            sb.push(chars[bytes[i] % chars.length]);
        }
        return sb.join("");
    }

    static fromInput(input) {
        const salt = randomBytes(SALT_LENGTH).toString('hex');
        const hash = scryptSync(input, salt, KEY_LENGTH).toString('hex');
        return new Password(hash, salt);
    }
}