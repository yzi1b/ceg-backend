import {Router} from 'express';
import {authenticate, jwtToUser} from "../auth.js";
import ExamTable from "../tables/ExamTable.js";
import CourseTable from "../tables/CourseTable.js";
import SubmissionTable from "../tables/SubmissionTable.js";
import User from "../entities/User.js";
import Exam from "../entities/Exam.js";
import Submission from "../entities/Submission.js";

const router = Router();

router.get('/', authenticate, jwtToUser, async (req, res) => {
    try {
        const user = req.user;
        let courses;

        if (user.role === User.Role.TEACHER) {
            courses = await CourseTable.listCoursesByOwner(user.id);
        } else if (user.role === User.Role.STUDENT) {
            courses = await CourseTable.listCoursesByStudent(user.id);
        } else {
            return res.status(200).send({ code: 0, opening: [], grading: [], preparing: [] });
        }

        if (courses.length === 0) {
            const empty = { code: 0, opening: [], grading: [] };
            if (user.role === User.Role.TEACHER) {
                empty.preparing = [];
            } else {
                empty.archived = [];
            }
            return res.status(200).send(empty);
        }

        const courseIds = courses.map(c => c.id.raw());
        const exams = await ExamTable.listExamsByCourseIds(courseIds);

        const courseMap = {};
        for (const course of courses) {
            courseMap[course.id.raw()] = course.title;
        }

        if (user.role === User.Role.TEACHER) {
            const opening = [];
            const grading = [];
            const preparing = [];

            for (const exam of exams) {
                const summary = exam.toJsonSummary();
                summary.courseTitle = courseMap[exam.courseId];

                switch (exam.stage) {
                    case Exam.Stage.OPENING:
                        opening.push(summary);
                        break;
                    case Exam.Stage.GRADING:
                        grading.push(summary);
                        break;
                    case Exam.Stage.PREPARING:
                        preparing.push(summary);
                        break;
                }
            }

            return res.status(200).send({ code: 0, opening, grading, preparing });
        } else {
            // Student
            const now = Date.now();
            const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

            const opening = [];
            const grading = [];
            const archived = [];

            const submissions = await SubmissionTable.listByStudent(user.id);
            const submissionMap = {};
            for (const sub of submissions) {
                submissionMap[sub.examId] = sub;
            }

            for (const exam of exams) {
                const submission = submissionMap[exam.id.raw()];
                const summary = exam.toJsonSummary();
                summary.courseTitle = courseMap[exam.courseId];
                summary.score = submission ? submission.total : -1;
                summary.status = submission
                    ? (submission.submit ? Submission.Status.SUBMITTED : Submission.Status.IN_PROGRESS)
                    : Submission.Status.NOT_TAKEN;

                if (exam.stage === Exam.Stage.OPENING) {
                    opening.push(summary);
                } else if (exam.stage === Exam.Stage.GRADING) {
                    grading.push(summary);
                } else if (exam.stage === Exam.Stage.ARCHIVED) {
                    const endsAt = exam.endsAt instanceof Date ? exam.endsAt.getTime() : exam.endsAt;
                    if (endsAt >= oneWeekAgo) {
                        archived.push(summary);
                    }
                }
            }

            return res.status(200).send({ code: 0, opening, grading, archived });
        }
    } catch (e) {
        return res.status(500).send({});
    }
});

export default router;
