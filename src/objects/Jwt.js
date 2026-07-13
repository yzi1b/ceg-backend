
import crypto from 'crypto';

export default class Jwt {
    static ALG = 'HS256';
    static DEFAULT_DURATION = 3_600_000;
    static secret = process.env.JWT_SECRET;

    constructor(sub, name, iat, exp, role) {
        this.sub = sub;
        this.name = name;
        this.iat = iat;
        this.exp = exp;
        this.role = role;
    }

    noExpired() {
        return Date.now() <= this.exp;
    }

    static generate(user, duration = Jwt.DEFAULT_DURATION) {
        if (duration <= 0) {
            duration = Jwt.DEFAULT_DURATION;
        }

        return new Jwt(user.accountId, user.userName, Date.now(),
            Date.now() + duration, user.role);
    }

    refresh(duration = Jwt.DEFAULT_DURATION) {
        if (duration <= 0) {
            duration = Jwt.DEFAULT_DURATION;
        }

        return new Jwt(this.sub, this.name,
            Date.now(), Date.now() + duration,
            this.role);
    }

    getHeader() {
        return {
            alg: Jwt.ALG,
        }
    }

    getPayload() {
        return {
            sub: this.sub,
            name: this.name,
            iat: this.iat,
            exp: this.exp,
            role: this.role,
        }
    }

    getSignature() {
        const data = `${base64urlEncode(this.getHeader())}.${base64urlEncode(this.getPayload())}`;
        return crypto.createHmac('sha256', Jwt.secret)
            .update(data)
            .digest('base64url');
    }

    toToken() {
        const header = base64urlEncode(this.getHeader());
        const payload = base64urlEncode(this.getPayload());
        const signature = this.getSignature();
        return `${header}.${payload}.${signature}`;
    }

    static fromToken(token, privateKey) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }

        const [headerEncoded, payloadEncoded, signature] = parts;

        if (privateKey) {
            const expected = crypto.createHmac('sha256', privateKey)
                .update(`${headerEncoded}.${payloadEncoded}`)
                .digest('base64url');
            if (signature !== expected) {
                throw new Error('Invalid token signature');
            }
        }

        let payload;
        try {
            payload = JSON.parse(base64urlDecode(payloadEncoded));
        } catch {
            throw new Error('Invalid token payload');
        }

        if (payload.exp && Date.now() > payload.exp) {
            throw new Error('Token expired');
        }

        return new Jwt(
            payload.sub,
            payload.name || '',
            payload.iat,
            payload.exp,
            payload.role,
        );
    }

    getAccountId() {
        return this.sub;
    }

    getUserName() {
        return this.name;
    }
}

function base64urlEncode(obj) {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function base64urlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf8');
}