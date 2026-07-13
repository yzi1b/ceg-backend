import { createHmac } from 'crypto';

const WIDTH = 8;
const HALF = WIDTH / 2;
const MOD_L = Math.pow(10, HALF);
const MOD_R = Math.pow(10, WIDTH - HALF);
const ROUNDS = 8;
const TOTAL_WIDTH = WIDTH + 1;

function getSecret() {
    const secret = process.env.DISPLAY_ID_KEY;
    if (!secret) {
        throw new Error('DISPLAY_ID_KEY environment variable is required');
    }
    return secret;
}

function checksum(digits) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        sum += parseInt(digits[i], 10) * (i + 1);
    }
    return (sum % 9) + 1;
}

function F(key, round, right) {
    const hmac = createHmac('sha256', key);
    hmac.update(Buffer.from([round]));
    hmac.update(String(right));
    const hash = hmac.digest();
    let val = 0;
    for (let i = 0; i < 4; i++) {
        val = val * 256 + hash[i];
    }
    return val % MOD_L;
}

function feistel(value, key, forward) {
    let left = Math.floor(value / MOD_R);
    let right = value % MOD_R;

    if (forward) {
        for (let i = 0; i < ROUNDS; i++) {
            const f = F(key, i, right);
            const nl = right;
            const nr = (left + f) % MOD_L;
            left = nl;
            right = nr;
        }
    } else {
        for (let i = ROUNDS - 1; i >= 0; i--) {
            const f = F(key, i, left);
            const nr = left;
            const nl = (right - f + MOD_L) % MOD_L;
            left = nl;
            right = nr;
        }
    }

    return left * MOD_R + right;
}

export default class DisplayableId {
    constructor(id) {
        this.id = id;
    }

    raw() {
        return this.id;
    }

    isValid() {
        return this.id > 0;
    }

    toDisplay() {
        const encrypted = feistel(this.id, getSecret(), true);
        const body = String(encrypted).padStart(WIDTH, '0');
        return Number(checksum(body) + body);
    }

    static fromDisplay(display) {
        const str = String(display);
        if (!str || str.length !== TOTAL_WIDTH || !/^\d+$/.test(str)) {
            return new DisplayableId(-1);
        }
        const cs = parseInt(str[0], 10);
        const body = str.slice(1);
        if (checksum(body) !== cs) {
            return new DisplayableId(-1);
        }
        try {
            const id = feistel(parseInt(body, 10), getSecret(), false);
            return new DisplayableId(id);
        } catch {
            return new DisplayableId(-1);
        }
    }
}
