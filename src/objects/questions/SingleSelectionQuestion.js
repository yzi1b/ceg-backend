import AbstractObjectiveQuestion from "./AbstractObjectiveQuestion.js";
import {stringUsable} from "string-usable";
import AbstractQuestion from "./AbstractQuestion.js";

export default class SingleSelectionQuestion extends AbstractObjectiveQuestion {
    static TYPE = 'obj.ssq';

    constructor(content, options, full, answer) {
        super(full);
        this.content = content;
        this.options = options;
        this.answer = answer;
    }

    getType() {
        return SingleSelectionQuestion.TYPE;
    }

    static from(qObj, aObj) {
        const { content, options, score } = qObj;

        if (!stringUsable(content)
            || !Array.isArray(options) || options.length <= 1) {
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

        if (!Number.isInteger(aObj)
            || aObj < 0 || aObj >= options.length) {
            throw new Error(AbstractQuestion.errors.ANSWER_INVALID);
        }

        return new SingleSelectionQuestion(content, options, score, aObj);
    }

    toQObj() {
        return {
            type: SingleSelectionQuestion.TYPE,
            content: this.content,
            options: this.options,
            score: this.getFull(),
        };
    }

    toAObj() {
        return this.answer;
    }

    score(aObj) {
        return aObj === this.answer ?
            this.getFull() : 0;
    }
}