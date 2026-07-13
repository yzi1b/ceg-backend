import AbstractSubjectiveQuestion from "./AbstractSubjectiveQuestion.js";
import {stringUsable} from "string-usable";
import AbstractQuestion from "./AbstractQuestion.js";

export default class ShortAnswerQuestion extends AbstractSubjectiveQuestion {
    static TYPE = 'sbj.saq';

    constructor(content, full, answer) {
        super(full);
        this.content = content;
        this.answer = answer;
    }

    getType() {
        return ShortAnswerQuestion.TYPE;
    }

    static from(qObj, aObj) {
        const { content, full } = qObj;

        if (!stringUsable(content)) {
            throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
        }

        if (!Number.isInteger(full) || full <= 0) {
            throw new Error(AbstractQuestion.errors.QUESTION_INVALID);
        }

        if (!stringUsable(aObj)) {
            throw new Error(AbstractQuestion.errors.ANSWER_INVALID);
        }

        return new ShortAnswerQuestion(content, full, aObj);
    }

    toQObj() {
        return {
            type: ShortAnswerQuestion.TYPE,
            content: this.content,
            full: this.getFull(),
        };
    }

    toAObj() {
        return this.answer;
    }
}
