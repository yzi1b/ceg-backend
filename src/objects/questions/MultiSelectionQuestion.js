import AbstractObjectiveQuestion from "./AbstractObjectiveQuestion.js";
import {stringUsable} from "string-usable";
import {isNullOrUndefined} from "../../utils.js";
import AbstractQuestion from "./AbstractQuestion.js";

export default class MultiSelectionQuestion extends AbstractObjectiveQuestion {
    static TYPE = 'obj.msq';

    constructor(content, options, strict, full, partial, answer) {
        super(full);
        this.content = content;
        this.options = options;
        this.strict = strict;
        this.partial = partial;
        this.answer = answer;
    }

    getType() {
        return MultiSelectionQuestion.TYPE;
    }

    static from(qObj, aObj) {
        const { content, options, strict, score, partial } = qObj;

        if (!stringUsable(content) || isNullOrUndefined(strict)
            || !Array.isArray(options) || options.length <= 2) {
            throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
        }
        for (const option of options) {
            if (!stringUsable(option)) {
                throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
            }
        }

        if (!Number.isInteger(score) || score <= 0) {
            throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
        }
        if (!Number.isInteger(partial)
            || partial < 0 || partial > score) {
            throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
        }

        if (!Array.isArray(aObj)) {
            throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
        }
        if (aObj.length === 0 || new Set(aObj).size !== aObj.length) {
            throw new Error(AbstractQuestion.errors.ANSWER_INVALID);
        }
        for (const a of aObj) {
            if (!Number.isInteger(a) || a < 0 || a >= options.length) {
                throw new Error(AbstractQuestion.errors.ANSWER_INVALID);
            }
        }

        return new MultiSelectionQuestion(content, options, !!strict, score, partial, aObj);
    }

    toQObj() {
        return {
            type: MultiSelectionQuestion.TYPE,
            content: this.content,
            options: this.options,
            strict: this.strict,
            score: this.getFull(),
            partial: this.partial,
        };
    }

    toAObj() {
        return this.answer;
    }

    score(aObj) {
        if (!Array.isArray(aObj) || aObj.length === 0) {
            return 0;
        }
        if (new Set(aObj).size !== aObj.length) {
            return 0;
        }

        for (const a of aObj) {
            if (!this.answer.includes(a)) {
                return 0;
            }
        }

        if (aObj.length === this.answer.length) {
            return this.full;
        } else {
            return this.partial;
        }
    }
}