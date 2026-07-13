export default class AbstractQuestion {
    static errors = {
        QUESTION_INVALID: 'question_invalid',
        ANSWER_INVALID: 'answer_invalid',
    };

    constructor(full) {
        this.full = full;
    }

    getType() {
        return "";
    }

    isSubjective() {
        return false;
    }

    static from(qObj, aObj) {
        return null;
    }

    getFull() {
        return this.full;
    }

    toQObj() {
        return null;
    }

    toAObj() {
        return null;
    }
}