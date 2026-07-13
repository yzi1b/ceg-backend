import SingleSelectionQuestion from "./questions/SingleSelectionQuestion.js";
import MultiSelectionQuestion from "./questions/MultiSelectionQuestion.js";
import ObjFillInBlankQuestion from "./questions/ObjFillInBlankQuestion.js";
import SbjFillInBlankQuestion from "./questions/SbjFillInBlankQuestion.js";
import ShortAnswerQuestion from "./questions/ShortAnswerQuestion.js";
import {stringUsable} from "string-usable";
import AbstractQuestion from "./questions/AbstractQuestion.js";

export default class PaperContent {
    /**
     *
     * @type {Map<string, function>}
     */
    static QUESTIONS_MAP = new Map();

    static errors = {
        QUESTION_PHASE_ERROR: 'question_phase_error',
    }

    constructor(title, questions) {
        this.title = title;
        this.questions = questions;
    }

    static from(title, questions, answers) {
        if (!stringUsable(title)) {
            throw new Error(PaperContent.errors.QUESTION_PHASE_ERROR);
        }

        if (!Array.isArray(questions) || !Array.isArray(answers)
            || questions.length === 0 || questions.length !== answers.length) {
            throw new Error(PaperContent.errors.QUESTION_PHASE_ERROR);
        }

        const fq = [];

        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].type) {
                throw new Error(PaperContent.errors.QUESTION_PHASE_ERROR);
            }
            const parser =
                PaperContent.QUESTIONS_MAP.get(questions[i].type);
            if (!parser) {
                throw new Error(PaperContent.errors.QUESTION_PHASE_ERROR);
            }
            try {
                fq.push(parser(questions[i], answers[i]));
            } catch (error) {
                if (error.message === AbstractQuestion.errors.QUESTION_INVALID
                    || error.message === AbstractQuestion.errors.ANSWER_INVALID) {
                    throw new Error(PaperContent.errors.ANSWER_INVALID);
                } else {
                    throw error;
                }
            }
        }

        return new PaperContent(title, fq);
    }

    getFull() {
        let full = 0;
        for (const question of this.questions) {
            full += question.getFull();
        }
        return full;
    }

    getQRaw() {
         return this.questions.map(question => question.toQObj())
    }

    getARaw() {
        return this.questions.map(question => question.toAObj())
    }
}

PaperContent.QUESTIONS_MAP
    .set(SingleSelectionQuestion.TYPE, SingleSelectionQuestion.from)
    .set(MultiSelectionQuestion.TYPE, MultiSelectionQuestion.from)
    .set(ObjFillInBlankQuestion.TYPE, ObjFillInBlankQuestion.from)
    .set(SbjFillInBlankQuestion.TYPE, SbjFillInBlankQuestion.from)
    .set(ShortAnswerQuestion.TYPE, ShortAnswerQuestion.from);