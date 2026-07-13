import AbstractQuestion from "./AbstractQuestion.js";

export default class AbstractObjectiveQuestion extends AbstractQuestion {
    getType() {
        return 'obj';
    }

    isSubjective() {
        return false;
    }

    score() {
        return 0;
    }
}