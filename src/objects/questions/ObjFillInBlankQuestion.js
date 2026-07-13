import AbstractObjectiveQuestion from "./AbstractObjectiveQuestion.js";
import {stringUsable} from "string-usable";
import AbstractQuestion from "./AbstractQuestion.js";

export default class ObjFillInBlankQuestion extends AbstractObjectiveQuestion {
    static TYPE = 'obj.fib';

    constructor(content, blanks, full, answer) {
        super(full);
        this.content = content;
        this.blanks = blanks;
        this.answer = answer;
    }

    getType() {
        return ObjFillInBlankQuestion.TYPE;
    }

    static from(qObj, aObj) {
        const { content, blanks } = qObj;

        if (!stringUsable(content)
            || !Array.isArray(blanks) || blanks.length === 0) {
            throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
        }

        let full = 0;
        for (const blank of blanks) {
            if (!Array.isArray(blank) || blank.length !== 2) {
                throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
            }
            if (!stringUsable(blank[0])) {
                throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
            }
            if (!Number.isInteger(blank[1]) || blank[1] <= 0) {
                throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
            }

            full += blank[1];
        }

        if (!Array.isArray(aObj) || aObj.length !== blanks.length) {
            throw new Error(AbstractQuestion.errors.ANSWER_INVALID);
        }
        for (const a of aObj) {
            if (!stringUsable(a)) {
                throw new Error(AbstractQuestion.errors.ANSWER_INVALID);
            }
        }

        return new ObjFillInBlankQuestion(content, blanks, full, aObj);
    }

    toQObj() {
        return {
            type: ObjFillInBlankQuestion.TYPE,
            content: this.content,
            blanks: this.blanks,
        };
    }

    toAObj() {
        return this.answer;
    }

    score(aObj) {
        if (!Array.isArray(aObj) || aObj.length !== this.blanks.length) {
            return 0;
        }

        let count = 0;
        for (let i = 0; i < this.blanks.length; i++) {
            if (aObj[i] === this.blanks[i][0]) {
                count += this.blanks[i][1];
            }
        }

        return count;
    }
}