import AbstractQuestion from "./AbstractQuestion.js";

export default class AbstractSubjectiveQuestion extends AbstractQuestion {
    getType() {
        return 'sbj';
    }

    isSubjective() {
        return true;
    }

    score() {
        return 0;
    }
}