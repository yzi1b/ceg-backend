import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const TAG_LENGTH = 16;
const IV_LENGTH = 12;

function deriveKey() {
    return crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
}

export default class GradeToken {
    constructor(submissionId, questionIndex, userId, expireAt) {
        this.submissionId = submissionId;
        this.questionIndex = questionIndex;
        this.userId = userId;
        this.expireAt = expireAt;
    }

    static create(submissionId, questionIndex, userId, duration) {
        return new GradeToken(submissionId, questionIndex, userId, Date.now() + duration);
    }

    isValid() {
        return Date.now() <= this.expireAt;
    }

    toToken() {
        const payload = JSON.stringify({
            submissionId: this.submissionId,
            questionIndex: this.questionIndex,
            userId: this.userId,
            expireAt: this.expireAt,
        });

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv);
        const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();

        return Buffer.concat([iv, encrypted, tag]).toString('base64url');
    }

    static fromToken(token) {
        let buf;
        try {
            buf = Buffer.from(token, 'base64url');
        } catch {
            throw new Error('Invalid grade token');
        }

        if (buf.length < IV_LENGTH + TAG_LENGTH) {
            throw new Error('Invalid grade token');
        }

        const iv = buf.subarray(0, IV_LENGTH);
        const tag = buf.subarray(buf.length - TAG_LENGTH);
        const encrypted = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);

        let payload;
        try {
            const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(), iv);
            decipher.setAuthTag(tag);
            payload = JSON.parse(decipher.update(encrypted) + decipher.final('utf8'));
        } catch {
            throw new Error('Invalid grade token');
        }

        return new GradeToken(
            payload.submissionId,
            payload.questionIndex,
            payload.userId,
            payload.expireAt,
        );
    }
}
